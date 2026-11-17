(function () {
  'use strict';

  window.BrokApp = window.BrokApp || {};

  const SVG_NS = 'http://www.w3.org/2000/svg';
  let lastShakenFruitId = null;
  let shakeTimeoutId = null;

  function createSvgEl(tag, attrs) {
    const el = document.createElementNS(SVG_NS, tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        el.setAttribute(key, String(attrs[key]));
      });
    }
    return el;
  }

  function drawBananaArtwork(group) {
    // Skygge / omriss og bananbue
    group.appendChild(
      createSvgEl('path', {
        d: 'M -28 -6 C -18 22, 16 24, 30 -4 C 32 -8, 28 -13, 24 -10 C 12 8, -12 8, -22 -11 C -25 -15, -30 -11, -28 -6 Z',
        fill: '#FACC15',
        stroke: '#CA8A04',
        'stroke-width': '2.5',
        'stroke-linejoin': 'round'
      })
    );
    // Lysrefleks
    group.appendChild(
      createSvgEl('path', {
        d: 'M -18 -2 C -8 12, 11 12, 21 -2',
        fill: 'none',
        stroke: '#FEF9C3',
        'stroke-width': '3',
        'stroke-linecap': 'round'
      })
    );
    // Stilk og tupp
    group.appendChild(
      createSvgEl('path', {
        d: 'M -25 -10 L -30 -16',
        fill: 'none',
        stroke: '#78350F',
        'stroke-width': '3.5',
        'stroke-linecap': 'round'
      })
    );
    group.appendChild(
      createSvgEl('circle', {
        cx: 28,
        cy: -7,
        r: 2.3,
        fill: '#78350F'
      })
    );
  }

  function drawAppleArtwork(group) {
    // Eplekropp
    group.appendChild(
      createSvgEl('path', {
        d: 'M 0 -16 C -10 -22, -24 -13, -23 2 C -22 16, -11 24, -2 22 C 0 21, 0 21, 2 22 C 11 24, 22 16, 23 2 C 24 -13, 10 -22, 0 -16 Z',
        fill: '#EF4444',
        stroke: '#B91C1C',
        'stroke-width': '2.5',
        'stroke-linejoin': 'round'
      })
    );
    // Glans
    group.appendChild(
      createSvgEl('path', {
        d: 'M -13 -8 C -16 -2, -15 6, -11 11',
        fill: 'none',
        stroke: '#FECACA',
        'stroke-width': '3',
        'stroke-linecap': 'round'
      })
    );
    // Stilk
    group.appendChild(
      createSvgEl('path', {
        d: 'M 0 -15 C 0 -22, 3 -25, 6 -27',
        fill: 'none',
        stroke: '#78350F',
        'stroke-width': '3',
        'stroke-linecap': 'round'
      })
    );
    // Grønt blad
    group.appendChild(
      createSvgEl('path', {
        d: 'M 2 -21 C 10 -26, 17 -22, 14 -15 C 9 -14, 4 -16, 2 -21 Z',
        fill: '#22C55E',
        stroke: '#15803D',
        'stroke-width': '1.8'
      })
    );
  }

  function drawOrangeArtwork(group) {
    // Appelsinkule
    group.appendChild(
      createSvgEl('circle', {
        cx: 0,
        cy: 2,
        r: 22,
        fill: '#FB923C',
        stroke: '#C2410C',
        'stroke-width': '2.5'
      })
    );
    // Glansbue
    group.appendChild(
      createSvgEl('path', {
        d: 'M -12 -8 A 14 14 0 0 0 -13 9',
        fill: 'none',
        stroke: '#FFEDD5',
        'stroke-width': '3',
        'stroke-linecap': 'round'
      })
    );
    // Små porer i skallet
    [
      [8, -4],
      [12, 4],
      [6, 11]
    ].forEach(function (pt) {
      group.appendChild(
        createSvgEl('circle', {
          cx: pt[0],
          cy: pt[1],
          r: 1.3,
          fill: '#EA580C'
        })
      );
    });
    // Grønt stilkfeste på toppen
    group.appendChild(
      createSvgEl('path', {
        d: 'M -5 -18 L 0 -14 L 5 -18 L 2 -21 L -2 -21 Z',
        fill: '#16A34A',
        stroke: '#14532D',
        'stroke-width': '1.5',
        'stroke-linejoin': 'round'
      })
    );
  }

  function drawPearArtwork(group) {
    // Pæreform
    group.appendChild(
      createSvgEl('path', {
        d: 'M 0 -22 C -7 -22, -10 -14, -12 -6 C -15 2, -21 8, -19 16 C -17 24, -8 27, 0 27 C 8 27, 17 24, 19 16 C 21 8, 15 2, 12 -6 C 10 -14, 7 -22, 0 -22 Z',
        fill: '#A3E635',
        stroke: '#4D7C0F',
        'stroke-width': '2.5',
        'stroke-linejoin': 'round'
      })
    );
    // Glans
    group.appendChild(
      createSvgEl('path', {
        d: 'M -8 -2 C -11 5, -12 12, -8 18',
        fill: 'none',
        stroke: '#ECFCCB',
        'stroke-width': '3',
        'stroke-linecap': 'round'
      })
    );
    // Stilk
    group.appendChild(
      createSvgEl('path', {
        d: 'M 0 -22 C 1 -27, 3 -30, 6 -31',
        fill: 'none',
        stroke: '#78350F',
        'stroke-width': '3',
        'stroke-linecap': 'round'
      })
    );
    // Lite blad
    group.appendChild(
      createSvgEl('path', {
        d: 'M 1 -26 C 8 -30, 14 -26, 11 -20 C 7 -20, 3 -22, 1 -26 Z',
        fill: '#22C55E',
        stroke: '#15803D',
        'stroke-width': '1.6'
      })
    );
  }

  function drawPlatterBase(svg) {
    const defs = createSvgEl('defs');

    const rimGrad = createSvgEl('linearGradient', {
      id: 'platterRimGrad',
      x1: '0%',
      y1: '0%',
      x2: '0%',
      y2: '100%'
    });
    rimGrad.appendChild(createSvgEl('stop', { offset: '0%', 'stop-color': '#FDE68A' }));
    rimGrad.appendChild(createSvgEl('stop', { offset: '100%', 'stop-color': '#D97706' }));

    const wellGrad = createSvgEl('radialGradient', {
      id: 'platterWellGrad',
      cx: '50%',
      cy: '45%',
      r: '55%'
    });
    wellGrad.appendChild(createSvgEl('stop', { offset: '0%', 'stop-color': '#FFFBEB' }));
    wellGrad.appendChild(createSvgEl('stop', { offset: '100%', 'stop-color': '#FEF3C7' }));

    defs.appendChild(rimGrad);
    defs.appendChild(wellGrad);
    svg.appendChild(defs);

    // Gulvskygge under fatet
    svg.appendChild(
      createSvgEl('ellipse', {
        cx: 240,
        cy: 254,
        rx: 196,
        ry: 24,
        fill: 'rgba(15, 23, 42, 0.09)'
      })
    );

    // Fatets underkant / skålform
    svg.appendChild(
      createSvgEl('path', {
        d: 'M 42 186 C 65 268, 415 268, 438 186 Z',
        fill: 'url(#platterRimGrad)',
        stroke: '#B45309',
        'stroke-width': '3'
      })
    );

    // Selve fatflaten der fruktene ligger
    svg.appendChild(
      createSvgEl('ellipse', {
        cx: 240,
        cy: 168,
        rx: 208,
        ry: 92,
        fill: 'url(#platterWellGrad)',
        stroke: '#D97706',
        'stroke-width': '4'
      })
    );

    // Indre dekorring på fatet
    svg.appendChild(
      createSvgEl('ellipse', {
        cx: 240,
        cy: 168,
        rx: 178,
        ry: 74,
        fill: 'none',
        stroke: '#FCD34D',
        'stroke-width': '2',
        'stroke-dasharray': '6 6'
      })
    );
  }

  /**
   * Støtter både:
   *   render(containerEl, fruits, { mode, targetFruit, countedIds }, onFruitClick)
   * og kontraktsformen:
   *   render(containerEl, fruits, mode, countedIds, onFruitClick)
   */
  function normalizeArgs(modeOrOpts, countedOrCb, maybeCb) {
    if (modeOrOpts && typeof modeOrOpts === 'object') {
      return {
        mode: modeOrOpts.mode || 'overview',
        targetFruit: modeOrOpts.targetFruit || 'banana',
        countedIds: Array.isArray(modeOrOpts.countedIds) ? modeOrOpts.countedIds : [],
        onFruitClick: typeof countedOrCb === 'function' ? countedOrCb : null
      };
    }
    return {
      mode: typeof modeOrOpts === 'string' ? modeOrOpts : 'overview',
      targetFruit: 'banana',
      countedIds: Array.isArray(countedOrCb) ? countedOrCb : [],
      onFruitClick: typeof maybeCb === 'function' ? maybeCb : null
    };
  }

  function render(containerEl, fruits, modeOrOpts, countedOrCb, maybeCb) {
    if (!containerEl) {
      return;
    }

    const opts = normalizeArgs(modeOrOpts, countedOrCb, maybeCb);
    const mode = opts.mode;
    const targetFruit = opts.targetFruit;
    const countedIds = opts.countedIds;
    const onFruitClick = opts.onFruitClick;

    const svg = createSvgEl('svg', {
      viewBox: '0 0 480 284',
      class: 'fruit-bowl-svg',
      role: 'group',
      'aria-label': 'Fruktfat med 10 frukter'
    });

    drawPlatterBase(svg);

    fruits.forEach(function (fruit) {
      const countedIndex = countedIds.indexOf(fruit.id);
      const isCounted = countedIndex !== -1;
      const isTarget = fruit.type === targetFruit;
      const isInteractive = mode === 'count-target' || mode === 'count-all' || mode === 'overview';

      const classes = ['fruit-node', 'fruit-type-' + fruit.type];
      if (isInteractive) {
        classes.push('is-interactive');
      }
      if (mode === 'count-target') {
        if (isTarget && !isCounted) {
          classes.push('is-target-awaiting');
        } else if (!isTarget) {
          classes.push('is-non-target');
        }
      }
      if (mode === 'count-all' && !isCounted) {
        classes.push('is-all-awaiting');
      }
      if (isCounted) {
        classes.push('is-counted');
      }
      if (mode === 'summary' && !isTarget) {
        classes.push('is-dimmed-summary');
      }
      if (lastShakenFruitId === fruit.id) {
        classes.push('is-shaking');
      }

      const outerGroup = createSvgEl('g', {
        transform: 'translate(' + fruit.x + ', ' + fruit.y + ')',
        'data-fruit-id': fruit.id,
        'data-fruit-type': fruit.type,
        class: classes.join(' '),
        tabindex: isInteractive ? '0' : '-1',
        role: 'button'
      });

      let ariaStatus = fruit.labelSingular;
      if ((mode === 'count-target' || mode === 'count-all') && isCounted) {
        ariaStatus += ', telt som nummer ' + (countedIndex + 1);
      } else if (mode === 'count-target' && isTarget) {
        ariaStatus += ', klikk for å telle';
      }
      outerGroup.setAttribute('aria-label', ariaStatus);

      // Usynlig klikkflate på minst 64x64 i SVG-koordinater for enkel berøring
      outerGroup.appendChild(
        createSvgEl('circle', {
          cx: 0,
          cy: 0,
          r: 33,
          fill: 'transparent',
          class: 'fruit-hit-area'
        })
      );

      // Fremhevingsglød bak målfrukter når vi teller eller oppsummerer
      if (
        (mode === 'count-target' && isTarget && !isCounted) ||
        (mode === 'summary' && isTarget)
      ) {
        outerGroup.appendChild(
          createSvgEl('circle', {
            cx: 0,
            cy: 2,
            r: 30,
            class: 'fruit-target-halo'
          })
        );
      }

      // Liten kontaktskygge på fatet under hver frukt
      outerGroup.appendChild(
        createSvgEl('ellipse', {
          cx: 0,
          cy: 24,
          rx: 20,
          ry: 6,
          fill: 'rgba(120, 53, 15, 0.14)'
        })
      );

      const artGroup = createSvgEl('g', {
        transform: 'rotate(' + (fruit.rotation || 0) + ')',
        class: 'fruit-artwork'
      });

      if (fruit.type === 'banana') {
        drawBananaArtwork(artGroup);
      } else if (fruit.type === 'apple') {
        drawAppleArtwork(artGroup);
      } else if (fruit.type === 'orange') {
        drawOrangeArtwork(artGroup);
      } else if (fruit.type === 'pear') {
        drawPearArtwork(artGroup);
      }

      outerGroup.appendChild(artGroup);

      // Nummerert merke når frukten er telt opp i steg 1 eller 2
      if ((mode === 'count-target' || mode === 'count-all') && isCounted) {
        const badgeColor = mode === 'count-target' ? '#D97706' : '#2563EB';
        const badgeGroup = createSvgEl('g', {
          transform: 'translate(17, -18)',
          class: 'fruit-count-badge'
        });

        badgeGroup.appendChild(
          createSvgEl('circle', {
            cx: 0,
            cy: 0,
            r: 13,
            fill: badgeColor,
            stroke: '#FFFFFF',
            'stroke-width': '2.5'
          })
        );

        const textEl = createSvgEl('text', {
          x: 0,
          y: 4.5,
          'text-anchor': 'middle',
          fill: '#FFFFFF',
          'font-size': '13',
          'font-weight': '800',
          'font-family': 'Segoe UI, sans-serif'
        });
        textEl.textContent = String(countedIndex + 1);
        badgeGroup.appendChild(textEl);
        outerGroup.appendChild(badgeGroup);
      }

      function triggerInteraction() {
        if (!onFruitClick) {
          return;
        }
        if (mode === 'count-target' && !isTarget) {
          lastShakenFruitId = fruit.id;
          outerGroup.classList.remove('is-shaking');
          // Force reflow for shake animation
          void outerGroup.getBoundingClientRect();
          outerGroup.classList.add('is-shaking');
          if (shakeTimeoutId) {
            clearTimeout(shakeTimeoutId);
          }
          shakeTimeoutId = setTimeout(function () {
            lastShakenFruitId = null;
            outerGroup.classList.remove('is-shaking');
          }, 450);
        }
        onFruitClick(fruit);
      }

      outerGroup.addEventListener('click', function () {
        triggerInteraction();
      });

      outerGroup.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          triggerInteraction();
        }
      });

      svg.appendChild(outerGroup);
    });

    containerEl.innerHTML = '';
    containerEl.appendChild(svg);
  }

  window.BrokApp.FruitBowl = {
    render: render
  };
})();
