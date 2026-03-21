(function () {
    'use strict';

    // Kolory z xdr-gtk (dark theme) — hierarchia: RDS > Stereo > Mono
    // Mono to domyślny kolor wykresu (--color-4), nie dodajemy osobnego datasetu
    const COLOR_STEREO_FILL = 'rgba(0, 130, 70, 0.35)';   // ciemniejszy zielony
    const COLOR_RDS_FILL    = 'rgba(0, 210, 120, 0.55)';  // oryginalny kolor RDS

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
                'margin-left: 8px',
                'font-size: 22px',
                'font-weight: bold',
                'letter-spacing: 0.5px',

                'vertical-align: middle',
                'user-select: none',
            ].join(';');
            container.insertAdjacentElement('afterend', rdsSpan);
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
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectRdsIndicators);
    } else {
        injectRdsIndicators();
    }

    // Aktualizuj co 200ms
    setInterval(updateRdsIndicators, 200);

    waitForChart((chart) => {
        // Dataset 1 — Stereo (pod RDS)
        if (chart.data.datasets.length < 2) {
            chart.data.datasets.push({
                label: 'Signal Stereo',
                borderColor: 'rgba(0,0,0,0)',
                borderWidth: 0,
                fill: { target: 'start', above: COLOR_STEREO_FILL },
                backgroundColor: 'rgba(0,0,0,0)',
                tension: 0.6,
                pointRadius: 0,
                spanGaps: false,
                data: []
            });
        }

        // Dataset 2 — RDS (nad Stereo)
        if (chart.data.datasets.length < 3) {
            chart.data.datasets.push({
                label: 'Signal RDS',
                borderColor: 'rgba(0,0,0,0)',
                borderWidth: 0,
                fill: { target: 'start', above: COLOR_RDS_FILL },
                backgroundColor: 'rgba(0,0,0,0)',
                tension: 0.6,
                pointRadius: 0,
                spanGaps: false,
                data: []
            });
        }

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

            const ds0    = c.data.datasets[0]?.data;
            const dsSt   = c.data.datasets[1]?.data;
            const dsRds  = c.data.datasets[2]?.data;
            if (!ds0 || !dsSt || !dsRds) return;

            const pd = typeof parsedData !== 'undefined' ? parsedData : null;
            const rdsOn = pd && pd.rdsActive === true;
            // st z tej samej ramki co wykres — bez opóźnienia względem stereoActive z serwera
            const stereoOn = pd && pd.st === true;

            const lastPt = ds0[ds0.length - 1];
            if (!lastPt) return;

            // Stereo + RDS jednocześnie: obie warstwy muszą mieć ten sam y, żeby nie było
            // pionowych „dziur” między wypełnieniami (np. mono + RDS wcześniej zostawiało null na stereo).
            const yStereoBand = (stereoOn || rdsOn) ? lastPt.y : null;
            dsSt.push({ x: lastPt.x, y: yStereoBand });
            if (dsSt.length > 400) dsSt.shift();

            dsRds.push({ x: lastPt.x, y: rdsOn ? lastPt.y : null });
            if (dsRds.length > 400) dsRds.shift();
        };

        chart.update('none');
        console.log('[RdsActivity] aktywny.');
    });
})();