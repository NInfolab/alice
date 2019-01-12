#!/usr/bin/env bash

# This script registers a new URL to be monitored by
# https://uptimerobot.com. It requires having an account on this
# service (free or not) with its API key.

# The API is described at https://uptimerobot.com/api

function call_curl {
    method=$1
    shift

    curl --silent --show-error \
         --request POST \
         --url https://api.uptimerobot.com/v2/$method \
         --header 'content-type: application/x-www-form-urlencoded' \
         --data-urlencode "api_key=$API_KEY" \
         "$@"
}

# Return all registered alert contact ids in a format suitable for the
# newMonitor API call.
#
# If there are 3 alert contact ids, id1, id2 and id3, we should return
# id1_0_0-id2_0_0-id3_0_0
function get_contact_ids {
    call_curl getAlertContacts | \
        grep -oE '"id"\s*:\s*"[0-9]+"' | \
        sed -E 's/"id"\s*:\s*"([0-9]+)"/\1_0_0/g' | \
        tr '\n' '-' | \
        sed -E 's/-+$//'
}

# Register a new URL to be monitored
function monitor_new_host {
    url=$1

    call_curl newMonitor \
              --data-urlencode "friendly_name=$url" \
              --data-urlencode "url=$url" \
              --data-urlencode "type=1" \
              --data-urlencode "sub_url=2" \
              --data-urlencode "alert_contacts=$(get_contact_ids)"

}

if [[ $# -ne 2 ]]; then
    echo "Usage: $0 API_KEY https://www.example.org"
    exit 0
fi

API_KEY=$1
URL=$2

RES=$(monitor_new_host $URL)
echo $RES | grep -E '"stat"\s*:\s*"ok"' --quiet

if [[ ${PIPESTATUS[1]} -ne 0 ]]; then
  echo "Error: $RES"
  exit 1
fi
