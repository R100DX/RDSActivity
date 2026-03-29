<img width="1173" height="830" alt="web2" src="https://github.com/user-attachments/assets/5a8a73d3-93be-486b-8c28-9163a886ffc9" />

# RDS Activity Plugin for FM-DX Webserver

A plugin for [FM-DX Webserver](https://github.com/NoobishSVK/fm-dx-webserver) that visualizes RDS and stereo activity directly on the signal chart - inspired by the behavior of [xdr-gtk](https://github.com/kkonradpl/xdr-gtk).

## Features

- **Colored fill on the signal chart** - appears when a station is broadcasting RDS data
- **Darker fill** - appears when a station is broadcasting in stereo (without RDS)
- **RDS icon** next to the stereo indicator - lights up when RDS is detected
- **Sync Chart Colors** - automatically matches the signal chart colors to the active webserver theme. If disabled, the chart will revert to its default green colors. This can be toggled on or off in the Settings panel.
- **Adjustable signal smoothing** - control how smooth or sharp the signal line looks on the chart
- **Chart edge fix** - prevents flickering on the left edge of the signal chart

This makes it immediately clear from the signal chart when a station is transmitting RDS and stereo, without having to look at separate indicators.

### Configuration options

At the top of `RdsActivity/frontend.js` there are five options:

```javascript
const SHOW_RDS_ICON    = true;   // RDS icon next to stereo indicator (true/false)
const SHOW_STEREO_FILL = true;   // stereo fill on the chart (true/false)
const USE_THEME_COLOR = true;    // match chart colors to the webserver theme
                                 // actual value is read from localStorage (can be toggled in Settings panel)
const BUFFER_SIZE = 1;           // Number of samples used to average the signal value on the chart.
                                 // 1 = raw (no averaging), higher values produce a smoother line.
                                 // null = disabled (use default averaging from main.js).
const FIX_MAX_POINTS = true;     // Prevents flickering on the left edge of the signal chart.
                                 // true  = auto-calculate from chart config (recommended).
                                 // false = keep the original hardcoded limit of 400.
```

**`USE_THEME_COLOR`** - when enabled, the RDS and stereo fill colors automatically follow the active webserver theme. When disabled, the colors defined below are used instead:

```javascript
const COLOR_STEREO_FILL = 'rgba(0, 130, 70, 0.35)';
const COLOR_RDS_FILL    = 'rgba(0, 210, 120, 0.30)';
```
### Requirements

- [FM-DX Webserver](https://github.com/NoobishSVK/fm-dx-webserver) v1.4 or later

  
### Installation

1. Copy the files into your FM-DX Webserver `plugins/` directory:

```
plugins/
├── RdsActivity.js
└── RdsActivity/
    ├── frontend.js
    └── frontend_server.js
```

2. Restart the webserver, go to Settings -> Plugins and enable RDS Activity.
3. Restart the webserver again.

> **Note:** This plugin's code was developed with the assistance of AI.
