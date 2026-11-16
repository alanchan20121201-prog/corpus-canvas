/* 7 interface languages (top languages by speakers, Traditional Chinese included, no Cantonese).
   Full dictionaries live in i18n.js for zh-CN / zh-TW / en / ja.
   Packs below are hand-written core UI translations; anything missing falls back to English. */
(function () {
  'use strict';
  var CC = window.CC = window.CC || {};

  CC.LANG_META = [
    { code: 'zh-CN', label: '简体中文', en: 'Chinese (Simplified)' },
    { code: 'zh-TW', label: '繁體中文', en: 'Chinese (Traditional)' },
    { code: 'en', label: 'English', en: 'English' },
    { code: 'ja', label: '日本語', en: 'Japanese' },
    { code: 'es', label: 'Español', en: 'Spanish' },
    { code: 'fr', label: 'Français', en: 'French' },
    { code: 'ko', label: '한국어', en: 'Korean' }
  ];

})();
