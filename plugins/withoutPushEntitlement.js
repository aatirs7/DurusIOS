const { withEntitlementsPlist } = require('expo/config-plugins');

/**
 * Removes the aps-environment entitlement.
 *
 * expo-notifications ships a config plugin that Expo auto-applies whenever the
 * package is installed, and it adds aps-environment unconditionally. That
 * entitlement requires the Push Notifications capability on the provisioning
 * profile, and a build fails outright when the profile lacks it.
 *
 * Durus only ever schedules local notifications, for the two daily reminder
 * slots and the Wednesday class nudge. Spec section 8 excludes push entirely,
 * so the capability is not merely unnecessary, it is something the product has
 * committed not to use. Stripping it keeps the entitlements honest and keeps
 * the provisioning profile simple.
 *
 * Listed last in app.json so it runs after the auto-applied plugin and wins.
 */
module.exports = function withoutPushEntitlement(config) {
  return withEntitlementsPlist(config, (cfg) => {
    delete cfg.modResults['aps-environment'];
    return cfg;
  });
};
