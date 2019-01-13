# Setup

[Complete guide](https://circleci.com/blog/deploying-documentation-to-github-pages-with-continuous-integration/)

- Generate a SSH key pair: `ssh-keygen -C travisci-alice-deploy -m PEM -N "" -f travisci_id_rsa`
- Go to https://circleci.com/gh/NInfolab/alice/edit#ssh
    + Add a new key
        * Host: github.com
        * Key: paste content of the __private__ key file
- Copy the fingerprint into .circleci/config.yaml
    + 
    ```yaml
    - add_ssh_keys:
        fingerprints: [ "bd:07:5f:84:3b:0c:41:3d:7b:04:50:17:27:bf:7d:a0" ]
    ```
- Add the public key to https://github.com/NInfolab/alice/settings/keys with write access
