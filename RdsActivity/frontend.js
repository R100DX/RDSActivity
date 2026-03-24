/// https://github.com/R100DX/RDSActivity ///

(function () {
    'use strict';

    // ── Options ──────────────────────────────────────────────
    const SHOW_RDS_ICON    = true;   // RDS icon next to the stereo indicator
    const SHOW_STEREO_FILL = true;   // stereo fill on the signal chart
    const USE_THEME_COLOR  = true;   // match chart colors to the webserver theme
    // ─────────────────────────────────────────────────────────

    // Default colors (used when USE_THEME_COLOR = false)
    const COLOR_STEREO_FILL_DEFAULT = 'rgba(0, 130, 70, 0.35)';
    const COLOR_RDS_FILL_DEFAULT    = 'rgba(0, 210, 120, 0.30)';

    // Get the current theme accent color (--color-main-bright)
    // and generate RDS/stereo colors based on it
    function getThemeColors() {
        if (!USE_THEME_COLOR) {
            return {
                stereo: COLOR_STEREO_FILL_DEFAULT,
                rds:    COLOR_RDS_FILL_DEFAULT,
            };
        }
        const raw = getComputedStyle(document.documentElement)
            .getPropertyValue('--color-main-bright').trim();
        
        // Parse rgb(r, g, b)
        const m = raw.match(/(\d+(?:\.\d+)?)[,\s]+(\d+(?:\.\d+)?)[,\s]+(\d+(?:\.\d+)?)/);
        if (!m) {
            return {
                stereo: COLOR_STEREO_FILL_DEFAULT,
                rds:    COLOR_RDS_FILL_DEFAULT,
            };
        }
        const r = parseFloat(m[1]);
        const g = parseFloat(m[2]);
        const b = parseFloat(m[3]);
        return {
            stereo: `rgba(${Math.round(r*0.4)}, ${Math.round(g*0.4)}, ${Math.round(b*0.4)}, 0.45)`,
            rds:    `rgba(${r}, ${g}, ${b}, 0.30)`,
        };
    }

    function waitForChart(cb) {
        if (window.signalChart &&
            window.signalChart.data &&
            window.signalChart.data.datasets &&
            window.signalChart.config.options.scales.x.realtime) {
            cb(window.signalChart);
        } else {
            setTimeout(() => waitForChart(cb), 200);
        }
    }

    // Inject RDS icons next to stereo indicators
    function injectRdsIndicators() {
        document.querySelectorAll('.stereo-container').forEach((container) => {
            if (container.querySelector('.rds-indicator')) return;
            const rdsSpan = document.createElement('span');
            rdsSpan.className = 'rds-indicator';
            rdsSpan.textContent = 'RDS';
            rdsSpan.classList.add('opacity-half');
            rdsSpan.style.cssText = [
                'font-size: 21px',
                'font-weight: bold',
                'letter-spacing: 0.5px',
                'vertical-align: middle',
                'user-select: none',
				'margin-left: 6px;',
            ].join(';');
            container.insertAdjacentElement('beforebegin', rdsSpan);
        });
    }

    // Update RDS icons based on parsedData.rdsActive
    function updateRdsIndicators() {
        const active = typeof parsedData !== 'undefined' && parsedData.rdsActive === true;
        document.querySelectorAll('.rds-indicator').forEach((el) => {
            if (active) {
                el.classList.remove('opacity-half');
            } else {
                el.classList.add('opacity-half');
            }
        });
    }

    // Inject when DOM is ready
    if (SHOW_RDS_ICON) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', injectRdsIndicators);
        } else {
            injectRdsIndicators();
        }
        setInterval(updateRdsIndicators, 200);
    }

    waitForChart((chart) => {
        // Get colors from the theme (or defaults)
        const themeColors = getThemeColors();

        // Update colors when the theme changes
        function applyThemeColors() {
            const tc = getThemeColors();
            if (chart.data.datasets[1]) chart.data.datasets[1].fill.above = tc.stereo;
            const rdsIdx = SHOW_STEREO_FILL ? 2 : 1;
            if (chart.data.datasets[rdsIdx]) chart.data.datasets[rdsIdx].fill.above = tc.rds;
            chart.update('none');
        }

        // Observe --color-main-bright changes (theme change)
        if (USE_THEME_COLOR) {
            const observer = new MutationObserver(() => applyThemeColors());
            observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
        }

        // Dataset 1 — Stereo (under RDS)
        if (SHOW_STEREO_FILL && chart.data.datasets.length < 2) {
            chart.data.datasets.push({
                label: 'Signal Stereo',
                borderColor: 'rgba(0,0,0,0)',
                borderWidth: 0,
                fill: { target: 'start', above: themeColors.stereo },
                backgroundColor: 'rgba(0,0,0,0)',
                tension: 0.6,
                pointRadius: 0,
                spanGaps: false,
                order: 2,
                data: []
            });
        }

        // Dataset 2 — RDS (above Stereo or directly after ds0)
        const rdsDatasetIndex = SHOW_STEREO_FILL ? 3 : 2;
        if (chart.data.datasets.length < rdsDatasetIndex) {
            chart.data.datasets.push({
                label: 'Signal RDS',
                borderColor: 'rgba(0,0,0,0)',
                borderWidth: 0,
                fill: { target: 'start', above: themeColors.rds },
                backgroundColor: 'rgba(0,0,0,0)',
                tension: 0.6,
                pointRadius: 0,
                spanGaps: false,
                order: SHOW_STEREO_FILL ? 1 : 2,
                data: []
            });
        }

        // ds0 (mono) must be on top for the line to be visible
        chart.data.datasets[0].order = 3;

        const realtime = chart.config.options.scales.x.realtime;
        const origOnRefresh = realtime.onRefresh;

        realtime.onRefresh = (c) => {
            origOnRefresh(c);

            // Must be consistent with main.js (signal onRefresh): on desktop with hidden tab,
            // dataset[0] still grows — if we always returned here, layers 1–2 wouldn't keep up
            // with time and the Chart.js fill would "float" above the line after returning to the tab.
            const mobile =
                (typeof isAndroid !== 'undefined' && isAndroid) ||
                (typeof isIOS !== 'undefined' && isIOS) ||
                (typeof isIPadOS !== 'undefined' && isIPadOS);
            if (mobile && (document.hidden || !document.hasFocus())) return;

            const ds0  = c.data.datasets[0]?.data;
            const dsSt = SHOW_STEREO_FILL ? c.data.datasets[1]?.data : null;
            const dsRds = SHOW_STEREO_FILL ? c.data.datasets[2]?.data : c.data.datasets[1]?.data;
            if (!ds0 || !dsRds) return;

            const pd = typeof parsedData !== 'undefined' ? parsedData : null;
            const rdsOn = pd && pd.rdsActive === true;
            // stereo status from the same frame as the chart — no delay relative to stereoActive from server
            const stereoOn = pd && pd.st === true;

            const lastPt = ds0[ds0.length - 1];
            if (!lastPt) return;

            // Stereo + RDS simultaneously: both layers must have the same y value to avoid
            // vertical "gaps" between fills (e.g., mono + RDS previously left a null on stereo).
            if (SHOW_STEREO_FILL && dsSt) {
                const yStereoBand = (stereoOn || rdsOn) ? lastPt.y : null;
                dsSt.push({ x: lastPt.x, y: yStereoBand });
                if (dsSt.length > 400) dsSt.shift();
            }

            if (dsRds) {
                dsRds.push({ x: lastPt.x, y: rdsOn ? lastPt.y : null });
                if (dsRds.length > 400) dsRds.shift();
            }
        };

        chart.update('none');
        console.log('[RdsActivity] active.');
    });
})();