const { walk } = require('file')
const fs = require('fs-extra')
const path = require('path')

const myArgs = process.argv.slice(2);
const subPath = myArgs[0]
const shouldWrite = myArgs[1] === 'write'
const scanDirectory = path.join(__dirname, subPath)

/**
  * Walk directories to find and migrate old templates.json index files
  * Old:   {"3": {guideId: "600", templateId: 3}, "4" : {guideId: "600", templateId: 4}}
  *        [{guideId: "600", templateId: 3}, {guideId: "600", templateId: 4}]
  *        []
  * New:   { "guideId": "600", "templateIds" : [ 2, 4 ] }
*/

walk(scanDirectory, updateTemplatesJson)

function getGuideId (dirPath) {
  const startIndex = dirPath.indexOf('Guide') + 5
  return dirPath.substring(startIndex)
}

function updateTemplatesJson (nully, dirPath, dirs, currentFiles) {
  if (currentFiles) {
    let backupPath, oldTemplatesJson, oldTemplatesData, newTemplatesJson, guideId, templateIds

    currentFiles.forEach(path => {
      if (path.endsWith('templates.json')) {
        if (shouldWrite) {
          // read old templates.json
          oldTemplatesJson = fs.readFileSync(path, 'UTF-8', function (err, data) {
            if (!err) {
              return data
            } else {
              console.error('read error', err)
              return
            }
          })

          try {
            oldTemplatesData = JSON.parse(oldTemplatesJson)
          } catch (error) {
            console.error('PARSING FAIL:', path)
            return
          }

          // skip if already in new format
          // { "guideId": "600", "templateIds" : [ 2, 4 ] }
          if (oldTemplatesData.hasOwnProperty('templateIds')) {
            console.log('already updated:', path)
          } else {
            // back it up
            backupPath = `${path}.backup`
            fs.writeFileSync(backupPath, oldTemplatesJson, function (err){
              if (err) {
                console.error('error writing backup', err)
                return
              } else {
                console.log('backed up:', backupPath)
              }
            })

            // upgrade to new format needs a guideId
            guideId = getGuideId(dirPath)
            if (!guideId) {
              console.error('no guideId found', err)
              return
            }

            // some old templates.json files are empty arrays
            if (!Array.isArray(oldTemplatesData)) {
              templateIds = updateTemplatesIds(oldTemplatesData)
            } else {
              templateIds = buildTemplateIds(dirPath)
            }
            const newTemplatesData = { guideId, templateIds }

            // write new json
            newTemplatesJson = JSON.stringify(newTemplatesData, null, '\t')
            fs.writeFileSync(path, newTemplatesJson, function (err){
              if (err) {
                console.error('error writing new file', err)
                return
              }
            })
            console.log('updated:', path)
            console.log('to this json:', newTemplatesJson)
          }
        } else {
          console.log('found:', path)
        }
      }
    })
  }
}

function updateTemplatesIds (oldTemplatesData) {
  const templateIds = []

  const objKeys = Object.keys(oldTemplatesData)
    objKeys.forEach(key => {
      const templateId = oldTemplatesData[key].templateId
      if (templateId) {
        // console.log('adding templateId: ', templateId)
        templateIds.push(templateId)
      }
    })

  return templateIds
}

function buildTemplateIds (dirPath) {
  let startIndex, endIndex
  const fileNames = fs.readdirSync(dirPath)

  return fileNames.filter(fileName => {
    return (fileName.startsWith('template') && fileName.endsWith('.json') && fileName !== 'templates.json')
    })
    .map(fileName => {
      startIndex = fileName.indexOf('template') + 8
      endIndex = fileName.indexOf('.', startIndex)
      return parseInt(fileName.substring(startIndex, endIndex))
  })
}
