var request = require('request');
var moment = require('moment');
require('console.table');
var config = require('./configuration.json')
var projects = config.projects,
  hostName = config.hostName;


Promise.resolve()
  .then(() => projects.map(getStatus.bind(null, hostName)))
  .then((projects) => Promise.all(projects))
  .then((results) => {
    return results.map(projectResultToBuildResult);
  }).then((parameters) => {
    return parameters.reduce((agg, current) => {
      if(!agg[current.component]){
        agg[current.component] = {
          name: current.component,
          parameters: []
        };
      }
      agg[current.component].parameters.push(createDisplayObject(current));
      return agg;
    }, Object.create(null));
  }).then((groups) => {
    Object.keys(groups).map((key)=>groups[key]).forEach(printSection);
    return groups;
  }).catch((err) => console.error(err));


function getStatus(host, project){
  return makeGetRequest(`http://${host}/job/${project.url}/lastSuccessfulBuild/api/json`)
    .then((data)=>{return {
      project: project,
      data: data
    }});
}

function makeGetRequest(uri) {
  return promiseifyRequest(request.bind(null, uri));
}

function printSeparator(title){
  console.log('\r\n\r\n');
  return Promise.resolve();
}


function printSection(section){
  printSeparator();
  console.table(section.name, section.parameters);
}


function promiseifyRequest(requestCall) {
  return new Promise((resolve, reject) => {
    requestCall((error, response, body) => {
      if (error) {
        reject(error);
      } else {
        if (response.statusCode === 200) {
          resolve(body);
        } else {
          reject(body);
        }
      }
    });
  }).then((body) => JSON.parse(body));
}

function projectResultToBuildResult(result) {
  var lastRevision = result.data.actions.filter((action) => action.lastBuiltRevision)[0].lastBuiltRevision.SHA1;
  return {
    name: result.project.key,
    value: `${result.project.version}-${lastRevision.substring(0, 7) }-${result.data.number}`,
    component: result.project.component,
    buildTimestamp: result.data.timestamp
  };
}

function createDisplayObject(buildResult){
  return {
    'name': buildResult.name,
    'Last Built': moment(buildResult.buildTimestamp).fromNow(),
    'Build Tag': buildResult.value
  };
}