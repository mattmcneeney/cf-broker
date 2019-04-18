var express = require('express'),
   fs = require('fs'),
   app = express(),
   bodyParser = require('body-parser'),
   cfClient = require('cf-nodejs-client');

app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

async function login(callback) {
   let CloudController = new cfClient.CloudController(process.env.CF_API),
      UsersUAA = new cfClient.UsersUAA;
   let result = await CloudController.getInfo();
   UsersUAA.setEndPoint(result.authorization_endpoint);
   return UsersUAA.login(process.env.CF_USERNAME, process.env.CF_PASSWORD);
}

async function createOrg(orgName) {
   console.log(`Creating org ${orgName}`);
   let result = await login();
   let Organizations = new cfClient.Organizations(process.env.CF_API);
   Organizations.setToken(result);
   let org = await Organizations.add({ name: orgName });
   return true;
}

async function deleteOrg(orgGuid) {
   console.log(`Deleting org ${orgGuid}`);
   let result = await login();
   let Organizations = new cfClient.Organizations(process.env.CF_API);
   Organizations.setToken(result);
   let org = await Organizations.remove(orgGuid, { recursive: true });
   return true;
}

async function getOrgGuid(orgName) {
   let result = await login();
   let Organizations = new cfClient.Organizations(process.env.CF_API);
   Organizations.setToken(result);
   let orgs = await Organizations.getOrganizations();
   let org = orgs.resources.find((org) => { return org.entity.name == orgName });
   return org.metadata.guid;
}

async function createSpace(spaceName, orgGuid) {
   console.log(`Creating space ${spaceName} in org ${orgGuid}`);
   let result = await login();
   let Spaces = new cfClient.Spaces(process.env.CF_API);
   Spaces.setToken(result);
   let space = await Spaces.add({ name: spaceName, organization_guid: orgGuid });
   return true;
}

async function deleteSpace(spaceGuid) {
   console.log(`Deleting space ${spaceGuid}`);
   let result = await login();
   let Spaces = new cfClient.Spaces(process.env.CF_API);
   Spaces.setToken(result);
   let org = await Spaces.remove(spaceGuid, { recursive: true });
   return true;
}

async function getSpaceGuid(spaceName) {
   let result = await login();
   let Spaces = new cfClient.Spaces(process.env.CF_API);
   Spaces.setToken(result);
   let spaces = await Spaces.getSpaces();
   let space = spaces.resources.find((space) => { return space.entity.name == spaceName });
   return space.metadata.guid;
}

app.get('/v2/catalog', function(req, res) {
   var data = {
      services: [{
         name: 'cf',
         description: 'A service broker used for provisioning a place to run your 12-factor apps',
         id: '011dc653-871b-4bae-aff2-90bff0c75ca2',
         bindable: true,
         plans: [{
            name: 'default',
            id: '97c8c167-de95-43c7-93df-12ee82059c0b',
            description: 'Creates a new org and space',
            free: true
         }]
      }]
   };
   res.json(data);
});

app.put('/v2/service_instances/:instance_id', function(req, res) {
   createOrg(req.params.instance_id).then(() => {
      getOrgGuid(req.params.instance_id).then((orgGuid) => {
         createSpace('development', orgGuid).then(() => {
            res.status(201).json({});
         }).catch((error) => {
            res.status(400).send(error);
         });
      }).catch((error) => {
         res.status(400).send(error);
      });
   }).catch((error) => {
      res.status(400).send(error);
   });
});

app.patch('/v2/service_instances/:instance_id', function(req, res) {
   // Updates are not supported!
   res.status(422).json({
      error: 'Not supported',
      description: 'Updating a service instance is not supported for this broker'
   });
});

app.delete('/v2/service_instances/:instance_id', function(req, res) {
   getOrgGuid(req.params.instance_id).then((orgGuid) => {
      deleteOrg(orgGuid).then(() => {
         res.json({});
      }).catch((error) => {
         res.status(422).send(error);
      });
   });
});

app.put('/v2/service_instances/:instance_id/service_bindings/:binding_id', function(req, res) {
   getOrgGuid(req.params.instance_id).then((orgGuid) => {
      // Return binding info
      res.json({
         credentials: {
            api: process.env.CF_API,
            org_name: req.params.instance_id,
            space_name: 'development'
         }
      });
   }).catch((error) => {
      res.status(422).send(error);
   });
});

app.delete('/v2/service_instances/:instance_id/service_bindings/:binding_id', function(req, res) {
   res.json({});
});

var port = process.env.PORT || 3000;
var server = app.listen(port, function() {
   // Check for required env vars
   const requiredEnvVars = [ 'CF_API', 'CF_USERNAME', 'CF_PASSWORD' ];
   requiredEnvVars.forEach((envVar) => {
     if (!process.env[envVar]) {
        console.error(`Missing required environmental variable: ${envVar}`);
        process.exit(1);
     }
     console.log(`${envVar}: ${process.env[envVar]}`);
   });
  console.log('Broker running on port ' + server.address().port);
});
