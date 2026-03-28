"use strict";
const settings_1 = require("./settings");
const InsteonLocalPlatform_1 = require("./InsteonLocalPlatform");
module.exports = (api) => {
    api.registerPlatform(settings_1.PLATFORM_NAME, InsteonLocalPlatform_1.InsteonLocalPlatform);
};
//# sourceMappingURL=index.js.map