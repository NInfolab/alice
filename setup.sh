#!/bin/bash
# Alice install script

# Exit script on error
set -e

ALICE_PORT=3000
LOG_DIR=/var/log/alice
CONF_DIR=/etc/alice
SRC_DIR=/usr/share/alice
SYSTEMD_DIR=/etc/systemd/system

echo 'Alice install script'

################################################################################
# INSTALL PARAMS
################################################################################
function askWithDefault {
  message="$1"
  default="$2"

  if [[ -z $default ]]; then
      read -p "$message: " choice </dev/tty
  else
      read -p "$message [$default]: " choice </dev/tty
      choice=${choice:-"$default"}
  fi

  echo "$choice"
}

# Get target mirror
if [ -z "$1" ]; then
  while true; do
    read -p 'Which website do you want to mirror? ' TARGET </dev/tty

    if  [[ $TARGET == http* ]] ; then
      break
    fi

    echo 'Bad input, format is: http(s)://my.website.com'
  done
else
  TARGET=$1
fi

# Get domain
if [ -z "$2" ]; then
  read -p 'What is your domain? ' HOSTNAME </dev/tty
  HOSTNAME=$(echo "$HOSTNAME" | sed 's/http[s]*:\/\///g')
else
  HOSTNAME=$2
fi

# Get user email
if [ -z "$3" ]; then
  read -p 'What is your email (for lets encrypt certificate)? ' EMAIL </dev/tty
else
  EMAIL=$3
fi

UPTIMEROBOT_APIKEY=$(askWithDefault "Enter UptimeRobot main API Key (optional)" $UPTIMEROBOT_APIKEY)

################################################################################
# INSTALL
################################################################################
# Ensure dirs
sudo mkdir -p $CONF_DIR
sudo mkdir -p $LOG_DIR

# Git
if ! type "git" > /dev/null; then
  sudo apt-get update
  sudo apt-get -y install git
fi

# Node
if ! type "node" > /dev/null; then
  curl -sL https://deb.nodesource.com/setup_12.x | sudo -E bash -
  sudo apt-get -y install nodejs
fi

# Caddy
if ! type "caddy" > /dev/null; then
  curl https://getcaddy.com | bash -s personal http.cache
fi

# Alice
if [ ! -d $SRC_DIR ]; then
  sudo git clone https://github.com/NInfolab/alice.git $SRC_DIR
  sudo sh -c "cd $SRC_DIR && npm install"
else
  sudo sh -c "cd $SRC_DIR && git pull && npm install"
fi

################################################################################
# CONFIGURATION
################################################################################
# Generate alice configuration
sudo sh -c "cat > ${CONF_DIR}/alice.json <<- EOM
{
  \"target\": \"$TARGET\",
  \"port\": $ALICE_PORT,
  \"modules\": [
    [\"logger\", {}],
    [\"cache\", {}],
    [\"metrics\", {}],
    [\"cors\", {}],
    [\"redirection\", {}],
    [\"encoding\", {}],
    [\"transforms\", {}],
    [\"proxy\", {}]
  ]
}
EOM"

# Generate caddy configuration
sudo sh -c "cat > ${CONF_DIR}/caddy <<- EOM
$HOSTNAME {
  gzip
  cache
  log $LOG_DIR/caddy.log { ipmask 255.255.0.0 ffff:ffff:ffff:ff00:: }
  tls $EMAIL
  proxy / 127.0.0.1:$ALICE_PORT {
    transparent
    header_upstream X-Forwarded-Ssl on
  }
}
EOM"

# Generate caddy systemd service
sudo sh -c "cat > ${SYSTEMD_DIR}/alice-caddy.service <<- EOM
[Unit]
Description=Alice caddy service
PartOf=alice.service
After=alice.service

[Service]
User=root
ExecStart=/usr/local/bin/caddy -conf $CONF_DIR/caddy -agree
WorkingDirectory=$SRC_DIR
Restart=on-failure
LimitNOFILE=8192
StartLimitInterval=600

[Install]
WantedBy=alice.service
EOM"

# Generate node systemd service
sudo sh -c "cat > ${SYSTEMD_DIR}/alice-node.service <<- EOM
[Unit]
Description=Alice node service
PartOf=alice.service
After=alice.service

[Service]
User=root
ExecStart=/usr/bin/node $SRC_DIR/index.js ${CONF_DIR}/alice.json
WorkingDirectory=$SRC_DIR
Restart=on-failure
LimitNOFILE=8192
StartLimitInterval=600

[Install]
WantedBy=alice.service
EOM"

if ! [ -f ${SYSTEMD_DIR}/alice.service ]; then
# Generate alice systemd service
sudo sh -c "cat > ${SYSTEMD_DIR}/alice.service <<- EOM
[Unit]
Description=Alice service
Documentation=https://github.com/NInfolab/alice
After=network.target
[Service]
Type=oneshot
ExecStart=/bin/true
RemainAfterExit=yes
[Install]
WantedBy=multi-user.target
EOM"
fi

# Start Alice
sudo systemctl daemon-reload
sudo systemctl enable alice alice-caddy alice-node
sudo systemctl start alice alice-caddy alice-node


# UptimeRobot ping monitoring
if [[ -n $UPTIMEROBOT_APIKEY ]]; then
  echo "Registering URL for UptimeRobot.com monitoring"
  $SRC_DIR/scripts/uptimerobot-register.sh $UPTIMEROBOT_APIKEY "https://$HOSTNAME"
fi


echo "All set :)"
echo "Visit https://$HOSTNAME"
