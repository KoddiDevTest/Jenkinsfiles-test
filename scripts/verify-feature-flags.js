#!/usr/bin/node

require("dotenv").config();
const axios = require("axios");
const fs = require("fs");
const { env } = require("process");
const projectKey = process.env.KODDI_PROJECT_KEY;
const apiKey = process.env.LAUNCH_DARKLY_API_KEY;
const envToCheck = process.env.ENV_TO_CHECK;
const envToCheckAgainst = process.env.ENV_TO_CHECK_AGAINST;

const mismatchedFeatureFlags = [];

const getAndCompareFeatureFlags = async () => {
  const response = await axios.get(
    `https://app.launchdarkly.com/api/v2/flags/${projectKey}`,
    {
      headers: {
        Authorization: `${apiKey}`,
      },
    }
  );

  const featureFlags = response.data.items;
  console.log(featureFlags[0]);

  for (featureFlag of featureFlags) {
    const environments = featureFlag.environments;
    if (!environments[envToCheck] || !environments[envToCheckAgainst]) {
      mismatchedFeatureFlags.push(featureFlag);
      continue;
    }

    if (environments[envToCheck].on !== environments[envToCheckAgainst].on) {
      mismatchedFeatureFlags.push(featureFlag);
    }
  }
};

const main = async () => {
  await getAndCompareFeatureFlags();
  console.log(
    `Mismatched feature flags for ${envToCheck} and ${envToCheckAgainst}: `
  );
  for (featureFlag of mismatchedFeatureFlags) {
    console.log(featureFlag.key);
  }
};

main();
