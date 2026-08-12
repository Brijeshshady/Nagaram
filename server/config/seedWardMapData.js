const fs = require('fs');
const path = require('path');
const https = require('https');
const mongoose = require('mongoose');
const connectDB = require('./db');
const Ward = require('../models/Ward');

const GEOJSON_URL = 'https://raw.githubusercontent.com/datameet/Municipal_Spatial_Data/master/Chennai/Wards.geojson';
const LOCAL_GEOJSON_PATH = path.join(__dirname, 'Wards.geojson');

const downloadGeoJSON = () => {
  return new Promise((resolve, reject) => {
    console.log('Downloading Chennai Wards GeoJSON from GitHub...');
    https.get(GEOJSON_URL, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          fs.writeFileSync(LOCAL_GEOJSON_PATH, data, 'utf8');
          console.log('Saved Wards.geojson locally.');
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse/save GeoJSON: ${e.message}`));
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
};

const run = async () => {
  try {
    await connectDB();
    console.log('Connected to database...');

    let geoJsonData;
    if (fs.existsSync(LOCAL_GEOJSON_PATH)) {
      console.log('Loading local Wards.geojson...');
      const fileContent = fs.readFileSync(LOCAL_GEOJSON_PATH, 'utf8');
      geoJsonData = JSON.parse(fileContent);
    } else {
      geoJsonData = await downloadGeoJSON();
    }

    const features = geoJsonData.features || [];
    console.log(`Found ${features.length} features in GeoJSON. Mapping boundaries...`);

    let updatedCount = 0;

    for (const feature of features) {
      const wardNo = feature.properties && feature.properties.Ward_No;
      if (!wardNo) continue;

      const wardNum = parseInt(wardNo);
      if (isNaN(wardNum)) continue;

      // Find the Ward in MongoDB
      const ward = await Ward.findOne({ number: wardNum });
      if (ward) {
        // Map feature.geometry to boundaries
        ward.boundaries = {
          type: feature.geometry.type,
          coordinates: feature.geometry.coordinates
        };
        await ward.save();
        updatedCount++;
      }
    }

    console.log(`Mapping complete! Successfully updated boundaries for ${updatedCount} wards.`);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding ward map data:', error);
    process.exit(1);
  }
};

run();
