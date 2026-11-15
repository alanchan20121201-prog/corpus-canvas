/* Map themes: a small library of palettes that a map can borrow.
   Each theme only overrides the canvas-side variables, so the rest of the
   application keeps the look the user picked in Settings. */
(function () {
  'use strict';
  var CC = window.CC = window.CC || {};

  var THEMES = [
    {
      id: 'default', nameKey: 'theme.default',
      vars: {},
      fills: ['#f7f4ec', '#e9f1ea', '#e6eef7', '#f9eee3', '#f5e9ef', '#efeaf7', '#eef1e4', '#f0eee9'],
      tags: ['#8a9a5b', '#c08552', '#7d8fa9', '#a9738f', '#6f9c8f', '#b08a5a', '#8b84b8', '#a67c6b']
    },
    {
      id: 'paper', nameKey: 'theme.paper',
      vars: {
        '--accent': '#9a6b3f', '--accent-2': '#c08a52', '--accent-soft': '#f3e7d6',
        '--text': '#3a3125', '--text-2': '#5c5140', '--muted': '#8a7c69',
        '--surface': '#fbf7ef', '--surface-2': '#f4ecdd', '--surface-3': '#eee3d0',
        '--border': '#e0d3bd', '--border-strong': '#cdb894',
        '--edge-hierarchy': '#c2b39a', '--edge-free': '#b09a78',
        '--map-bg': '#f7f1e4'
      },
      fills: ['#fbf3e2', '#f4e8d4', '#eee2cb', '#f7eadb', '#f2e6e0', '#ebe4d3', '#f5ecd8', '#e9dfc8'],
      tags: ['#a8813f', '#b8763f', '#8f7a4a', '#a2675f', '#6f8a5e', '#96702f', '#7d6f9c', '#a06a4a']
    },
    {
      id: 'ink', nameKey: 'theme.ink',
      vars: {
        '--accent': '#2f3b39', '--accent-2': '#4d5f5c', '--accent-soft': '#e0e6e4',
        '--text': '#1c1f1e', '--text-2': '#3d4442', '--muted': '#79817f',
        '--surface': '#ffffff', '--surface-2': '#f2f3f3', '--surface-3': '#e7e9e9',
        '--border': '#dcdedd', '--border-strong': '#c2c6c5',
        '--edge-hierarchy': '#b3bab8', '--edge-free': '#9aa3a1',
        '--map-bg': '#fafafa'
      },
      fills: ['#ffffff', '#f4f5f5', '#eceeef', '#f7f7f7', '#f0f2f2', '#e9ebeb', '#f5f4f2', '#f0f0f0'],
      tags: ['#3d4a48', '#5b6b69', '#2f3b39', '#6a7775', '#48554f', '#4a4a4a', '#3a3f4d', '#544a44']
    },
    {
      id: 'night', nameKey: 'theme.night',
      vars: {
        '--accent': '#7fb2c9', '--accent-2': '#9ccbdc', '--accent-soft': '#2b3b45',
        '--text': '#e6ebee', '--text-2': '#c3ccd1', '--muted': '#93a1a8',
        '--surface': '#1c2226', '--surface-2': '#232a2f', '--surface-3': '#2b3439',
        '--border': '#333d43', '--border-strong': '#465259',
        '--edge-hierarchy': '#5d6d75', '--edge-free': '#74858e',
        '--map-bg': '#151a1d'
      },
      fills: ['#232a2f', '#263036', '#2a343a', '#28303a', '#30353c', '#2c3339', '#333a41', '#252b2f'],
      tags: ['#7fb2c9', '#9ab98a', '#c2a878', '#b98a9a', '#8fbfae', '#c2a06a', '#a294c9', '#c08f74']
    },
    {
      id: 'forest', nameKey: 'theme.forest',
      vars: {
        '--accent': '#4f7a4a', '--accent-2': '#6b9666', '--accent-soft': '#e2eddf',
        '--text': '#232b20', '--text-2': '#3f4b39', '--muted': '#6f7d68',
        '--surface': '#f7faf4', '--surface-2': '#eef3e9', '--surface-3': '#e4ecdf',
        '--border': '#d5e0cd', '--border-strong': '#b9c9b0',
        '--edge-hierarchy': '#a9bda1', '--edge-free': '#95ac8d',
        '--map-bg': '#f3f7ef'
      },
      fills: ['#eef4e6', '#e3ecdb', '#e8f0e4', '#f0f2e2', '#e4ece6', '#e9efe1', '#e6eee8', '#f1f4e9'],
      tags: ['#5c8a4a', '#7f9a5a', '#4f7a72', '#8a7a52', '#5f8f7a', '#93814a', '#6f7a9a', '#8a6a52']
    },
    {
      id: 'dusk', nameKey: 'theme.dusk',
      vars: {
        '--accent': '#7a6ea8', '--accent-2': '#988fc0', '--accent-soft': '#e7e4f2',
        '--text': '#282437', '--text-2': '#413c56', '--muted': '#736d8b',
        '--surface': '#faf9fd', '--surface-2': '#f1eff7', '--surface-3': '#e8e5f1',
        '--border': '#ded9ea', '--border-strong': '#c2bad6',
        '--edge-hierarchy': '#b1a9c9', '--edge-free': '#9d95b8',
        '--map-bg': '#f5f3fb'
      },
      fills: ['#f1eef8', '#eae6f4', '#f0eaf2', '#e9eefa', '#f3ece6', '#ece9f6', '#f0ecf4', '#e8e8f0'],
      tags: ['#7a6ea8', '#9a7f9a', '#6f8aa8', '#a88a6f', '#6f9a8a', '#a89a5f', '#8a7ab0', '#a87a6f']
    }
  ];

  var byId = {};
  THEMES.forEach(function (t) { byId[t.id] = t; });

  function get(id) { return byId[id] || byId.default; }
  function list() { return THEMES.slice(); }

  /* Push a theme onto an element as inline custom properties, so the map
     canvas borrows the palette without touching the global look. */
  function apply(el, id) {
    if (!el) return null;
    var th = get(id);
    Object.keys(th.vars).forEach(function (k) {
      el.style.setProperty(k, th.vars[k]);
    });
    if (!th.vars['--map-bg']) el.style.removeProperty('--map-bg');
    return th;
  }

  function clear(el) {
    if (!el) return;
    var th = byId.default;
    Object.keys(th.vars).forEach(function (k) { el.style.removeProperty(k); });
    el.style.removeProperty('--map-bg');
  }

  CC.themes = { list: list, get: get, apply: apply, clear: clear };
})();
