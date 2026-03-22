/// https://github.com/R100DX/RDSActivity ///

(function () {
    'use strict';

    // ── Opcje ────────────────────────────────────────────────
    const SHOW_RDS_ICON    = true;   // ikonka RDS obok stereo
    const SHOW_STEREO_FILL = true;   // wypełnienie stereo na wykresie
    // ─────────────────────────────────────────────────────────

    // Kolory z xdr-gtk (dark theme) — hierarchia: RDS > Stereo > Mono
    // Mono to domyślny kolor wykresu (--color-4), nie dodajemy osobnego datasetu
    const COLOR_STEREO_FILL = 'rgba(0, 130, 70, 0.35)';   // ciemniejszy zielony
    const COLOR_RDS_FILL    = 'rgba(0, 210, 120, 0.30)';  // oryginalny kolor RDS

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

    // Wstrzyknij ikonki RDS obok wskaźników stereo
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
            ].join(';');
            container.insertAdjacentElement('beforebegin', rdsSpan);
        });
    }

    // Aktualizuj ikonki RDS na podstawie parsedData.rdsActive
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

    // Wstrzyknij gdy DOM gotowy
    if (SHOW_RDS_ICON) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', injectRdsIndicators);
        } else {
            injectRdsIndicators();
        }
        setInterval(updateRdsIndicators, 200);
    }

    waitForChart((chart) => {
        // Dataset 1 — Stereo (pod RDS)
        if (SHOW_STEREO_FILL && chart.data.datasets.length < 2) {
            chart.data.datasets.push({
                label: 'Signal Stereo',
                borderColor: 'rgba(0,0,0,0)',
                borderWidth: 0,
                fill: { target: 'start', above: COLOR_STEREO_FILL },
                backgroundColor: 'rgba(0,0,0,0)',
                tension: 0.6,
                pointRadius: 0,
                spanGaps: false,
                order: 2,
                data: []
            });
        }

        // Dataset 2 — RDS (nad Stereo lub bezpośrednio po ds0)
        const rdsDatasetIndex = SHOW_STEREO_FILL ? 3 : 2;
        if (chart.data.datasets.length < rdsDatasetIndex) {
            chart.data.datasets.push({
                label: 'Signal RDS',
                borderColor: 'rgba(0,0,0,0)',
                borderWidth: 0,
                fill: { target: 'start', above: COLOR_RDS_FILL },
                backgroundColor: 'rgba(0,0,0,0)',
                tension: 0.6,
                pointRadius: 0,
                spanGaps: false,
                order: SHOW_STEREO_FILL ? 1 : 2,
                data: []
            });
        }

        // ds0 (mono) musi być na wierzchu żeby linia była widoczna
        chart.data.datasets[0].order = 3;

        const realtime = chart.config.options.scales.x.realtime;
        const origOnRefresh = realtime.onRefresh;

        realtime.onRefresh = (c) => {
            origOnRefresh(c);

            // Musi być zgodne z main.js (onRefresh sygnału): na desktopie przy ukrytej karcie
            // dataset[0] nadal rośnie — gdybyśmy tu zawsze return, warstwy 1–2 nie nadążają
            // za czasem i wypełnienie Chart.js „pływa” ponad linią po powrocie na kartę.
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
            // st z tej samej ramki co wykres — bez opóźnienia względem stereoActive z serwera
            const stereoOn = pd && pd.st === true;

            const lastPt = ds0[ds0.length - 1];
            if (!lastPt) return;

            // Stereo + RDS jednocześnie: obie warstwy muszą mieć ten sam y, żeby nie było
            // pionowych „dziur” między wypełnieniami (np. mono + RDS wcześniej zostawiało null na stereo).
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
        console.log('[RdsActivity] aktywny.');
    });
})();