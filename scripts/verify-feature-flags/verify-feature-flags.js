require("dotenv").config();
const axios = require("axios");
const fs = require("fs");
const { env } = require("process");
const projectKey = process.env.KODDI_PROJECT_KEY;
const apiKey = process.env.LAUNCH_DARKLY_API_KEY;
const envToCheck = process.env.ENV_TO_CHECK;
const envToCheckAgainst = process.env.ENV_TO_CHECK_AGAINST;

const mismatchedFeatureFlags = [];
const environments = {};

const getAndCompareFeatureFlags = async () => {
  const response = await axios
    .get(`https://app.launchdarkly.com/api/v2/flags/${projectKey}`, {
      headers: {
        Authorization: `${apiKey}`,
      },
    })
    .catch((error) => {
      console.log(error);
      process.exit(1);
    });

  const featureFlags = response.data.items;

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

const getAndParseAllEnvironments = async () => {
  const response = await axios
    .get(
      `https://app.launchdarkly.com/api/v2/projects/${projectKey}/environments`,
      {
        headers: {
          Authorization: `${apiKey}`,
        },
      }
    )
    .catch((error) => {
      console.log(error);
      process.exit(1);
    });

  const environmentData = response.data.items;

  for (environment of environmentData) {
    environments[environment.key] = environment.name;
  }
};

const getEnvName = (env) => {
  return environments[env];
};

const main = async () => {
  await getAndCompareFeatureFlags();
  await getAndParseAllEnvironments();

  if (mismatchedFeatureFlags.length) {
    console.log(
      `Mismatched feature flags for ${getEnvName(
        envToCheck
      )} against ${getEnvName(envToCheckAgainst)}:`
    );
    for (featureFlag of mismatchedFeatureFlags) {
      console.log(
        `${featureFlag.key}: ${getEnvName(envToCheck)}-${
          featureFlag.environments[envToCheck].on
        }, ${getEnvName(envToCheckAgainst)}-${
          featureFlag.environments[envToCheckAgainst].on
        }`
      );
    }
    process.exit(1);
  } else {
    console.log(
      `All feature flags match for ${getEnvName(
        envToCheck
      )} against ${getEnvName(envToCheckAgainst)}!`
    );
  }
};

main();
