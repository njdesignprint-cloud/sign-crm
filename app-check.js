(function(){
  "use strict";
  window.initializeSignShopAppCheck=function(){
    const siteKey=window.SIGNSHOPHQ_RUNTIME_CONFIG?.appCheck?.recaptchaEnterpriseSiteKey;
    if(!siteKey||!window.firebase?.appCheck)return null;
    const appCheck=firebase.appCheck();
    appCheck.activate(new firebase.appCheck.ReCaptchaEnterpriseProvider(siteKey),true);
    return appCheck;
  };
})();
