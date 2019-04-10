# CF Broker

A service broker used for provisioning orgs and spaces in Cloud Foundry.

---

### Required environment variables
Since the service broker needs to be configured with an existing Cloud Foundry
environment, the following environmental variables are required:
```
CF_API=...
CF_USERNAME=...
CF_PASSWORD=...
```

Note that the provided credentials must provide the ability to create new orgs
and spaces.

### Installation
```bash
npm install
```

### Running
```bash
npm start
```

### Deploying (to Cloud Foundry)
```bash
cf push
```
