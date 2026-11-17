(function () {
  'use strict';

  window.BrokApp = window.BrokApp || {};

  const SVG_NS = 'http://www.w3.org/2000/svg';

  let currentArenaEl = null;
  let currentArrowOverlaySvg = null;
  let currentStepConfig = null;
  let currentContainerEl = null;
  let lastAnimatedSignature = '';
  let resizeObserverInstance = null;

  function createSvgEl(tag, attrs) {
    const el = document.createElementNS(SVG_NS, tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        el.setAttribute(key, String(attrs[key]));
      });
    }
    return el;
  }

  function createDomFraction(numContent, denContent, extraClass, partsAttr) {
    const box = document.createElement('div');
    box.className = 'fraction-big ' + (extraClass || '');

    const numSpan = document.createElement('span');
    numSpan.className = 'frac-part';
    if (partsAttr && partsAttr.numPart) {
      numSpan.setAttribute('data-part', partsAttr.numPart);
    }
    if (partsAttr && partsAttr.numArrowTarget) {
      numSpan.setAttribute('data-arrow-target', 'num');
    }
    if (typeof numContent === 'string' || typeof numContent === 'number') {
      numSpan.textContent = String(numContent);
    } else if (numContent instanceof Node) {
      numSpan.appendChild(numContent);
    }

    const divSpan = document.createElement('span');
    divSpan.className = 'frac-divider';

    const denSpan = document.createElement('span');
    denSpan.className = 'frac-part';
    if (partsAttr && partsAttr.denPart) {
      denSpan.setAttribute('data-part', partsAttr.denPart);
    }
    if (partsAttr && partsAttr.denArrowTarget) {
      denSpan.setAttribute('data-arrow-target', 'den');
    }
    if (partsAttr && partsAttr.denArrowSource) {
      denSpan.setAttribute('data-arrow-source', 'true');
      denSpan.classList.add('is-arrow-source');
    }
    if (typeof denContent === 'string' || typeof denContent === 'number') {
      denSpan.textContent = String(denContent);
    } else if (denContent instanceof Node) {
      denSpan.appendChild(denContent);
    }

    box.appendChild(numSpan);
    box.appendChild(divSpan);
    box.appendChild(denSpan);
    return box;
  }

  function createMultiplyExprNode(baseVal, factorVal, sideClass) {
    const frag = document.createDocumentFragment();
    const baseSpan = document.createElement('span');
    baseSpan.textContent = String(baseVal);
    frag.appendChild(baseSpan);

    const mulTag = document.createElement('span');
    mulTag.className = 'mul-factor-tag ' + (sideClass || '');
    mulTag.textContent = ' × ' + factorVal;
    frag.appendChild(mulTag);

    return frag;
  }

  function buildExpansionChoices(origNum, origDen, factor, taskKey) {
    const correctNum = origNum * factor;
    const correctDen = origDen * factor;

    const options = [
      {
        id: 'correct',
        num: correctNum,
        den: correctDen,
        isCorrect: true,
        hint: ''
      },
      {
        id: 'forgot-num',
        num: origNum,
        den: correctDen,
        isCorrect: false,
        hint:
          'Nesten! Nevneren ' +
          correctDen +
          ' er helt riktig, men husk å gange telleren øverst med ' +
          factor +
          ' også (' +
          origNum +
          ' × ' +
          factor +
          ').'
      },
      {
        id: 'added-instead',
        num: origNum + factor,
        den: origDen + factor,
        isCorrect: false,
        hint:
          'Pass på! Her ble det lagt sammen (+) i stedet for å gange (×). Regn ut ' +
          origNum +
          ' × ' +
          factor +
          ' øverst og ' +
          origDen +
          ' × ' +
          factor +
          ' nederst!'
      }
    ];

    // Deterministisk rekkefølge per oppgave og steg så knappene ikke hopper ved ny tegning
    let hash = 0;
    for (let i = 0; i < taskKey.length; i += 1) {
      hash = (hash * 31 + taskKey.charCodeAt(i)) % 997;
    }
    const orders = [
      [1, 0, 2],
      [0, 2, 1],
      [2, 1, 0],
      [0, 1, 2]
    ];
    const order = orders[hash % orders.length];
    return order.map(function (idx) {
      return options[idx];
    });
  }

  function renderFractionBarSvg(opts) {
    const origNum = opts.origNum;
    const origDen = opts.origDen;
    const subFactor = opts.subFactor;
    const isExpanded = opts.isExpanded;
    const animateSubdivision = opts.animateSubdivision;
    const fillColor = opts.fillColor;
    const strokeColor = opts.strokeColor;
    const clipId = opts.clipId;

    const totalUnits = isExpanded ? origDen * subFactor : origDen;
    const W = 580;
    const H = 38;
    const X0 = 4;
    const Y0 = 4;

    const svg = createSvgEl('svg', {
      viewBox: '0 0 ' + (W + 8) + ' ' + (H + 8),
      class: 'fraction-bar-svg',
      role: 'img',
      'aria-label': opts.ariaLabel || 'Visuell brøkstav'
    });

    const defs = createSvgEl('defs');
    const clip = createSvgEl('clipPath', { id: clipId });
    clip.appendChild(
      createSvgEl('rect', {
        x: X0,
        y: Y0,
        width: W,
        height: H,
        rx: 7,
        ry: 7
      })
    );
    defs.appendChild(clip);
    svg.appendChild(defs);

    // Bakgrunn (hele 1-eren)
    svg.appendChild(
      createSvgEl('rect', {
        x: X0,
        y: Y0,
        width: W,
        height: H,
        rx: 7,
        ry: 7,
        fill: '#F8FAFC'
      })
    );

    // Fargelagt andel (eksakt lik bredde før og etter utvidelse!)
    const filledWidth = (W * origNum) / origDen;
    svg.appendChild(
      createSvgEl('rect', {
        x: X0,
        y: Y0,
        width: filledWidth,
        height: H,
        fill: fillColor,
        'clip-path': 'url(#' + clipId + ')',
        class: 'bar-fill-rect'
      })
    );

    // Tynne underdelingslinjer når brøken er utvidet til fellesnevner
    if (isExpanded && subFactor > 1) {
      const subGroup = createSvgEl('g', {
        class: animateSubdivision ? 'bar-sublines is-animating' : 'bar-sublines',
        'clip-path': 'url(#' + clipId + ')'
      });

      const subStrokeWidth = totalUnits > 45 ? '0.9' : '1.3';
      const subDash = totalUnits > 45 ? 'none' : '3 2.5';

      for (let i = 1; i < totalUnits; i += 1) {
        if (i % subFactor === 0) {
          continue; // Tegnes som hovedlinje lenger ned
        }
        const xPos = X0 + (W * i) / totalUnits;
        const lineAttrs = {
          x1: xPos.toFixed(2),
          y1: Y0,
          x2: xPos.toFixed(2),
          y2: Y0 + H,
          stroke: 'rgba(15, 23, 42, 0.34)',
          'stroke-width': subStrokeWidth
        };
        if (subDash !== 'none') {
          lineAttrs['stroke-dasharray'] = subDash;
        }
        subGroup.appendChild(createSvgEl('line', lineAttrs));
      }

      svg.appendChild(subGroup);
    }

    // Opprinnelige hoveddelestreker
    const mainGroup = createSvgEl('g', {
      'clip-path': 'url(#' + clipId + ')'
    });
    for (let j = 1; j < origDen; j += 1) {
      const mainX = X0 + (W * j) / origDen;
      mainGroup.appendChild(
        createSvgEl('line', {
          x1: mainX.toFixed(2),
          y1: Y0,
          x2: mainX.toFixed(2),
          y2: Y0 + H,
          stroke: '#1E293B',
          'stroke-width': '2.2'
        })
      );
    }
    svg.appendChild(mainGroup);

    // Ytre ramme rundt staven
    svg.appendChild(
      createSvgEl('rect', {
        x: X0,
        y: Y0,
        width: W,
        height: H,
        rx: 7,
        ry: 7,
        fill: 'none',
        stroke: strokeColor,
        'stroke-width': '2.5'
      })
    );

    return svg;
  }

  function renderVisualBarsSection(math, stepState, animateWhich) {
    const section = document.createElement('div');
    section.className = 'bars-comparison-box';

    const headingRow = document.createElement('div');
    headingRow.className = 'bars-header-row';

    const heading = document.createElement('span');
    heading.className = 'bars-box-title';
    heading.textContent = 'Visuelle brøkstaver (begge stavene er like lange)';
    headingRow.appendChild(heading);

    const leftExpanded = stepState.step > 3 || (stepState.step === 3 && stepState.leftExpandedDone);
    const rightExpanded = stepState.step > 4 || (stepState.step === 4 && stepState.rightExpandedDone);

    const statusNote = document.createElement('span');
    statusNote.className = 'bars-status-pill';
    if (leftExpanded && rightExpanded) {
      statusNote.textContent = 'Begge delt i ' + math.commonDen + ' like store biter!';
      statusNote.classList.add('is-matched');
    } else {
      statusNote.textContent = 'Ulik størrelse på bitene foreløpig';
    }
    headingRow.appendChild(statusNote);
    section.appendChild(headingRow);

    // Øverste stav: Fruktfat-brøken
    const leftRow = document.createElement('div');
    leftRow.className = 'bar-row';

    const leftMeta = document.createElement('div');
    leftMeta.className = 'bar-row-label';
    const leftTitleSpan = document.createElement('span');
    leftTitleSpan.className = 'bar-name is-left';
    leftTitleSpan.textContent =
      math.fruitMeta.emoji +
      ' ' +
      math.fruitMeta.labelPlural.charAt(0).toUpperCase() +
      math.fruitMeta.labelPlural.slice(1);

    const leftValueSpan = document.createElement('span');
    leftValueSpan.className = 'bar-fraction-readout';
    const allCountedInStep2 = stepState.step > 2 || stepState.countedAllCount === math.leftDen;

    if (!allCountedInStep2) {
      leftValueSpan.textContent = math.leftNum + ' / ?';
    } else if (leftExpanded) {
      leftValueSpan.textContent =
        math.leftExpandedNum +
        '/' +
        math.commonDen +
        ' (' +
        math.leftExpandedNum +
        ' av ' +
        math.commonDen +
        ' ruter)';
    } else {
      leftValueSpan.textContent =
        math.leftNum + '/' + math.leftDen + ' (' + math.leftNum + ' av ' + math.leftDen + ' ruter)';
    }

    leftMeta.appendChild(leftTitleSpan);
    leftMeta.appendChild(leftValueSpan);
    leftRow.appendChild(leftMeta);

    if (allCountedInStep2) {
      leftRow.appendChild(
        renderFractionBarSvg({
          origNum: math.leftNum,
          origDen: math.leftDen,
          subFactor: math.leftFactor,
          isExpanded: leftExpanded,
          animateSubdivision: animateWhich === 'left',
          fillColor: '#FBBF24',
          strokeColor: '#D97706',
          clipId: 'clip-left-bar-' + math.task.id,
          ariaLabel: leftExpanded
            ? math.leftExpandedNum + ' av ' + math.commonDen + ' ruter fargelagt'
            : math.leftNum + ' av ' + math.leftDen + ' ruter fargelagt'
        })
      );
    } else {
      const pendingBar = document.createElement('div');
      pendingBar.className = 'bar-pending-placeholder';
      pendingBar.textContent =
        'Tell ferdig alle fruktene på fatet (' +
        stepState.countedAllCount +
        '/' +
        math.leftDen +
        ') for å dele inn brøkstaven!';
      leftRow.appendChild(pendingBar);
    }

    section.appendChild(leftRow);

    // Nederste stav: Påstandens sammenligningsbrøk
    const rightRow = document.createElement('div');
    rightRow.className = 'bar-row';

    const rightMeta = document.createElement('div');
    rightMeta.className = 'bar-row-label';
    const rightTitleSpan = document.createElement('span');
    rightTitleSpan.className = 'bar-name is-right';
    rightTitleSpan.textContent = '📏 Brøk i påstanden';

    const rightValueSpan = document.createElement('span');
    rightValueSpan.className = 'bar-fraction-readout';
    if (rightExpanded) {
      rightValueSpan.textContent =
        math.rightExpandedNum +
        '/' +
        math.commonDen +
        ' (' +
        math.rightExpandedNum +
        ' av ' +
        math.commonDen +
        ' ruter)';
    } else {
      rightValueSpan.textContent =
        math.rightNum +
        '/' +
        math.rightDen +
        ' (' +
        math.rightNum +
        ' av ' +
        math.rightDen +
        ' ruter)';
    }

    rightMeta.appendChild(rightTitleSpan);
    rightMeta.appendChild(rightValueSpan);
    rightRow.appendChild(rightMeta);

    rightRow.appendChild(
      renderFractionBarSvg({
        origNum: math.rightNum,
        origDen: math.rightDen,
        subFactor: math.rightFactor,
        isExpanded: rightExpanded,
        animateSubdivision: animateWhich === 'right',
        fillColor: '#A78BFA',
        strokeColor: '#7C3AED',
        clipId: 'clip-right-bar-' + math.task.id,
        ariaLabel: rightExpanded
          ? math.rightExpandedNum + ' av ' + math.commonDen + ' ruter fargelagt'
          : math.rightNum + ' av ' + math.rightDen + ' ruter fargelagt'
      })
    );

    section.appendChild(rightRow);
    return section;
  }

  function buildArrowHeadPolygon(tipX, tipY, fromX, fromY, color, animate) {
    const angle = Math.atan2(tipY - fromY, tipX - fromX);
    const size = 9;
    const spread = 0.52;

    const x1 = tipX - size * Math.cos(angle - spread);
    const y1 = tipY - size * Math.sin(angle - spread);
    const x2 = tipX - size * Math.cos(angle + spread);
    const y2 = tipY - size * Math.sin(angle + spread);

    return createSvgEl('polygon', {
      points:
        tipX.toFixed(1) +
        ',' +
        tipY.toFixed(1) +
        ' ' +
        x1.toFixed(1) +
        ',' +
        y1.toFixed(1) +
        ' ' +
        x2.toFixed(1) +
        ',' +
        y2.toFixed(1),
      fill: color,
      class: animate ? 'arrow-head is-animating' : 'arrow-head'
    });
  }

  function repositionArrows(animateNow) {
    if (!currentArenaEl || !currentArrowOverlaySvg || !currentStepConfig) {
      return;
    }

    const sourceEl = currentArenaEl.querySelector('[data-arrow-source="true"]');
    const targetNumEl = currentArenaEl.querySelector('[data-arrow-target="num"]');
    const targetDenEl = currentArenaEl.querySelector('[data-arrow-target="den"]');

    currentArrowOverlaySvg.innerHTML = '';

    if (!sourceEl || !targetNumEl || !targetDenEl) {
      return;
    }

    const arenaRect = currentArenaEl.getBoundingClientRect();
    if (arenaRect.width < 20 || arenaRect.height < 20) {
      return;
    }

    currentArrowOverlaySvg.setAttribute(
      'viewBox',
      '0 0 ' + arenaRect.width.toFixed(1) + ' ' + arenaRect.height.toFixed(1)
    );

    const srcRect = sourceEl.getBoundingClientRect();
    const numRect = targetNumEl.getBoundingClientRect();
    const denRect = targetDenEl.getBoundingClientRect();

    const direction = currentStepConfig.direction; // 'right-to-left' (steg 3) eller 'left-to-right' (steg 4)
    const color = currentStepConfig.color;
    const factorLabel = '× ' + currentStepConfig.factor;

    let startX;
    let startY;
    let numEndX;
    let numEndY;
    let denEndX;
    let denEndY;

    if (direction === 'right-to-left') {
      startX = srcRect.left - arenaRect.left - 4;
      startY = srcRect.top - arenaRect.top + srcRect.height * 0.5;

      numEndX = numRect.right - arenaRect.left + 6;
      numEndY = numRect.top - arenaRect.top + numRect.height * 0.5;

      denEndX = denRect.right - arenaRect.left + 6;
      denEndY = denRect.top - arenaRect.top + denRect.height * 0.5;
    } else {
      startX = srcRect.right - arenaRect.left + 4;
      startY = srcRect.top - arenaRect.top + srcRect.height * 0.5;

      numEndX = numRect.left - arenaRect.left - 6;
      numEndY = numRect.top - arenaRect.top + numRect.height * 0.5;

      denEndX = denRect.left - arenaRect.left - 6;
      denEndY = denRect.top - arenaRect.top + denRect.height * 0.5;
    }

    const midXNum = (startX + numEndX) * 0.5;
    const c1NumX = startX + (numEndX - startX) * 0.35;
    const c1NumY = Math.min(startY, numEndY) - 28;
    const c2NumX = startX + (numEndX - startX) * 0.72;
    const c2NumY = numEndY - 12;

    const c1DenX = startX + (denEndX - startX) * 0.35;
    const c1DenY = Math.max(startY, denEndY) + 22;
    const c2DenX = startX + (denEndX - startX) * 0.72;
    const c2DenY = denEndY + 14;

    const dNum =
      'M ' +
      startX.toFixed(1) +
      ' ' +
      startY.toFixed(1) +
      ' C ' +
      c1NumX.toFixed(1) +
      ' ' +
      c1NumY.toFixed(1) +
      ', ' +
      c2NumX.toFixed(1) +
      ' ' +
      c2NumY.toFixed(1) +
      ', ' +
      numEndX.toFixed(1) +
      ' ' +
      numEndY.toFixed(1);

    const dDen =
      'M ' +
      startX.toFixed(1) +
      ' ' +
      startY.toFixed(1) +
      ' C ' +
      c1DenX.toFixed(1) +
      ' ' +
      c1DenY.toFixed(1) +
      ', ' +
      c2DenX.toFixed(1) +
      ' ' +
      c2DenY.toFixed(1) +
      ', ' +
      denEndX.toFixed(1) +
      ' ' +
      denEndY.toFixed(1);

    const pathClass = animateNow ? 'arrow-curve is-animating' : 'arrow-curve';

    const pathNum = createSvgEl('path', {
      d: dNum,
      fill: 'none',
      stroke: color,
      'stroke-width': '3',
      'stroke-linecap': 'round',
      class: pathClass
    });

    const pathDen = createSvgEl('path', {
      d: dDen,
      fill: 'none',
      stroke: color,
      'stroke-width': '3',
      'stroke-linecap': 'round',
      class: pathClass
    });

    currentArrowOverlaySvg.appendChild(pathNum);
    currentArrowOverlaySvg.appendChild(pathDen);

    if (animateNow) {
      [pathNum, pathDen].forEach(function (p) {
        if (typeof p.getTotalLength === 'function') {
          const len = Math.ceil(p.getTotalLength());
          p.style.strokeDasharray = String(len);
          p.style.strokeDashoffset = String(len);
        }
      });
    }

    currentArrowOverlaySvg.appendChild(
      buildArrowHeadPolygon(numEndX, numEndY, c2NumX, c2NumY, color, animateNow)
    );
    currentArrowOverlaySvg.appendChild(
      buildArrowHeadPolygon(denEndX, denEndY, c2DenX, c2DenY, color, animateNow)
    );

    // Liten merkelapp midt mellom pilene som viser gangetegnet tydelig
    const pillX = midXNum;
    const pillY = (numEndY + denEndY) * 0.5;
    const badgeGroup = createSvgEl('g', {
      transform: 'translate(' + pillX.toFixed(1) + ', ' + pillY.toFixed(1) + ')',
      class: animateNow ? 'arrow-factor-pill is-animating' : 'arrow-factor-pill'
    });
    badgeGroup.appendChild(
      createSvgEl('rect', {
        x: -24,
        y: -13,
        width: 48,
        height: 26,
        rx: 13,
        fill: '#FFFFFF',
        stroke: color,
        'stroke-width': '2.2'
      })
    );
    const pillText = createSvgEl('text', {
      x: 0,
      y: 5,
      'text-anchor': 'middle',
      fill: color,
      'font-size': '13.5',
      'font-weight': '800',
      'font-family': 'Segoe UI, sans-serif'
    });
    pillText.textContent = factorLabel;
    badgeGroup.appendChild(pillText);
    currentArrowOverlaySvg.appendChild(badgeGroup);
  }

  function observeArenaResize(arenaEl) {
    if (resizeObserverInstance) {
      resizeObserverInstance.disconnect();
      resizeObserverInstance = null;
    }
    if (typeof ResizeObserver === 'function' && arenaEl) {
      resizeObserverInstance = new ResizeObserver(function () {
        repositionArrows(false);
      });
      resizeObserverInstance.observe(arenaEl);
    }
  }

  function renderExpansionQuizCard(questionHtml, choices, onChoose) {
    const quizBox = document.createElement('div');
    quizBox.className = 'expansion-quiz-card';

    const prompt = document.createElement('p');
    prompt.className = 'expansion-quiz-prompt';
    prompt.innerHTML = questionHtml;
    quizBox.appendChild(prompt);

    const btnRow = document.createElement('div');
    btnRow.className = 'expansion-choices-row';

    choices.forEach(function (choice) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'fraction-choice-btn';
      btn.setAttribute('aria-label', choice.num + ' over ' + choice.den);

      const numS = document.createElement('span');
      numS.className = 'choice-frac-num';
      numS.textContent = String(choice.num);

      const barS = document.createElement('span');
      barS.className = 'choice-frac-bar';

      const denS = document.createElement('span');
      denS.className = 'choice-frac-den';
      denS.textContent = String(choice.den);

      btn.appendChild(numS);
      btn.appendChild(barS);
      btn.appendChild(denS);

      btn.addEventListener('click', function () {
        if (!choice.isCorrect) {
          btn.classList.add('is-wrong-choice');
        }
        onChoose(choice);
      });

      btnRow.appendChild(btn);
    });

    quizBox.appendChild(btnRow);
    return quizBox;
  }

  function replayAnimation() {
    if (!currentContainerEl) {
      return;
    }
    if (currentArrowOverlaySvg && currentStepConfig) {
      repositionArrows(true);
    }
    const mulTags = currentContainerEl.querySelectorAll('.mul-factor-tag');
    mulTags.forEach(function (tag) {
      tag.classList.remove('is-replaying');
      void tag.getBoundingClientRect();
      tag.classList.add('is-replaying');
    });
    const subLines = currentContainerEl.querySelectorAll('.bar-sublines');
    subLines.forEach(function (g) {
      g.classList.remove('is-animating');
      void g.getBoundingClientRect();
      g.classList.add('is-animating');
    });
  }

  function renderStage(containerEl, math, stepState, callbacks) {
    if (!containerEl) {
      return;
    }
    currentContainerEl = containerEl;
    currentArenaEl = null;
    currentArrowOverlaySvg = null;
    currentStepConfig = null;

    const step = stepState.step;
    const signature =
      math.task.id +
      '|step=' +
      step +
      '|L=' +
      stepState.leftExpandedDone +
      '|R=' +
      stepState.rightExpandedDone;
    const isFreshSignature = signature !== lastAnimatedSignature;
    lastAnimatedSignature = signature;

    const wrapper = document.createElement('div');
    wrapper.className = 'animator-stage-wrapper';

    // --- STEG 2: Tell ferdig nevner og still opp brøkene + start-brøkstaver ---
    if (step === 2) {
      const row = document.createElement('div');
      row.className = 'fraction-comparison-row';

      const leftCol = document.createElement('div');
      leftCol.className = 'fraction-column';
      const leftLbl = document.createElement('span');
      leftLbl.className = 'fraction-col-label is-left';
      leftLbl.textContent =
        math.fruitMeta.emoji +
        ' ' +
        math.fruitMeta.labelPlural.charAt(0).toUpperCase() +
        math.fruitMeta.labelPlural.slice(1) +
        ' på fatet';
      leftCol.appendChild(leftLbl);

      const allCount = stepState.countedAllCount;
      const denNode = document.createElement('span');
      if (allCount === 0) {
        denNode.textContent = '?';
      } else {
        denNode.textContent = String(allCount);
      }

      const leftFracEl = createDomFraction(math.leftNum, denNode, 'is-left', {
        numPart: 'left-num',
        denPart: 'left-den'
      });
      const leftDenPart = leftFracEl.querySelector('[data-part="left-den"]');
      if (allCount === 0) {
        leftDenPart.classList.add('is-placeholder', 'is-active-slot');
      } else if (allCount < math.leftDen) {
        leftDenPart.classList.add('is-active-slot');
      } else {
        leftDenPart.classList.add('is-complete-slot');
      }
      leftCol.appendChild(leftFracEl);

      const vs = document.createElement('div');
      vs.className = 'vs-badge';
      vs.textContent = 'mot';

      const rightCol = document.createElement('div');
      rightCol.className = 'fraction-column';
      const rightLbl = document.createElement('span');
      rightLbl.className = 'fraction-col-label is-right';
      rightLbl.textContent = 'Påstandens brøk';
      rightCol.appendChild(rightLbl);
      rightCol.appendChild(
        createDomFraction(math.rightNum, math.rightDen, 'is-right', {
          numPart: 'right-num',
          denPart: 'right-den'
        })
      );

      row.appendChild(leftCol);
      row.appendChild(vs);
      row.appendChild(rightCol);
      wrapper.appendChild(row);

      wrapper.appendChild(renderVisualBarsSection(math, stepState, null));

      containerEl.innerHTML = '';
      containerEl.appendChild(wrapper);
      return;
    }

    // --- STEG 3: Utvid første brøk med nevneren fra andre brøk ---
    if (step === 3) {
      const arena = document.createElement('div');
      arena.className = 'fraction-comparison-row equation-arena';

      const overlaySvg = createSvgEl('svg', {
        class: 'arrow-overlay-svg',
        'aria-hidden': 'true'
      });
      arena.appendChild(overlaySvg);

      // Venstre kolonne: (leftNum × rightDen) / (leftDen × rightDen) [= leftExpandedNum / commonDen]
      const leftCol = document.createElement('div');
      leftCol.className = 'fraction-column';
      const leftLbl = document.createElement('span');
      leftLbl.className = 'fraction-col-label is-left';
      leftLbl.textContent = '1. Utvid fruktbrøken';
      leftCol.appendChild(leftLbl);

      const leftEquationWrap = document.createElement('div');
      leftEquationWrap.className = 'fraction-eq-inline';

      if (stepState.leftExpandedDone) {
        const solvedCard = createDomFraction(
          math.leftExpandedNum,
          math.commonDen,
          'is-left is-expanded-result',
          {}
        );
        const eqSign = document.createElement('span');
        eqSign.className = 'eq-sign';
        eqSign.textContent = '=';
        leftEquationWrap.appendChild(solvedCard);
        leftEquationWrap.appendChild(eqSign);
      }

      const workingLeftFrac = createDomFraction(
        createMultiplyExprNode(math.leftNum, math.leftFactor, 'from-right'),
        createMultiplyExprNode(math.leftDen, math.leftFactor, 'from-right'),
        'is-left is-working-frac',
        {
          numPart: 'left-num',
          denPart: 'left-den',
          numArrowTarget: true,
          denArrowTarget: true
        }
      );
      leftEquationWrap.appendChild(workingLeftFrac);
      leftCol.appendChild(leftEquationWrap);

      // Høyre kolonne: 1/3 med fremhevet nevner som kilde for pilene
      const rightCol = document.createElement('div');
      rightCol.className = 'fraction-column';
      const rightLbl = document.createElement('span');
      rightLbl.className = 'fraction-col-label is-right';
      rightLbl.textContent = 'Hent nevneren herfra';
      rightCol.appendChild(rightLbl);

      const rightFrac = createDomFraction(math.rightNum, math.rightDen, 'is-right', {
        numPart: 'right-num',
        denPart: 'right-den',
        denArrowSource: true
      });
      rightCol.appendChild(rightFrac);

      arena.appendChild(leftCol);
      arena.appendChild(rightCol);
      wrapper.appendChild(arena);

      if (!stepState.leftExpandedDone) {
        const choices = buildExpansionChoices(
          math.leftNum,
          math.leftDen,
          math.leftFactor,
          math.task.id + '-left'
        );
        const quizEl = renderExpansionQuizCard(
          'Vi ganger både teller og nevner med <strong>' +
            math.leftFactor +
            '</strong>. Hvilken brøk får vi da?',
          choices,
          function (picked) {
            if (picked.isCorrect) {
              if (callbacks && typeof callbacks.onLeftExpandedSolved === 'function') {
                callbacks.onLeftExpandedSolved();
              }
            } else if (callbacks && typeof callbacks.onWrongExpansionChoice === 'function') {
              callbacks.onWrongExpansionChoice(picked.hint);
            }
          }
        );
        wrapper.appendChild(quizEl);
      }

      const animateLeftBar = stepState.leftExpandedDone && isFreshSignature;
      wrapper.appendChild(
        renderVisualBarsSection(math, stepState, animateLeftBar ? 'left' : null)
      );

      containerEl.innerHTML = '';
      containerEl.appendChild(wrapper);

      currentArenaEl = arena;
      currentArrowOverlaySvg = overlaySvg;
      currentStepConfig = {
        direction: 'right-to-left',
        color: '#7C3AED',
        factor: math.leftFactor
      };
      observeArenaResize(arena);
      requestAnimationFrame(function () {
        repositionArrows(isFreshSignature && !stepState.leftExpandedDone);
      });
      return;
    }

    // --- STEG 4: Utvid andre brøk med opprinnelig nevner fra første brøk ---
    if (step === 4) {
      const arena = document.createElement('div');
      arena.className = 'fraction-comparison-row equation-arena';

      const overlaySvg = createSvgEl('svg', {
        class: 'arrow-overlay-svg',
        'aria-hidden': 'true'
      });
      arena.appendChild(overlaySvg);

      // Venstre kolonne: Vis både utvidet 9/30 = opprinnelig 3/10 (slik at nevner 10 er pil-kilde!)
      const leftCol = document.createElement('div');
      leftCol.className = 'fraction-column';
      const leftLbl = document.createElement('span');
      leftLbl.className = 'fraction-col-label is-left';
      leftLbl.textContent = 'Hent første nevner (' + math.leftDen + ')';
      leftCol.appendChild(leftLbl);

      const leftPairWrap = document.createElement('div');
      leftPairWrap.className = 'fraction-eq-inline';

      const expandedLeftCard = createDomFraction(
        math.leftExpandedNum,
        math.commonDen,
        'is-left is-expanded-result',
        {}
      );
      const eqSignLeft = document.createElement('span');
      eqSignLeft.className = 'eq-sign';
      eqSignLeft.textContent = '=';

      const origLeftCard = createDomFraction(math.leftNum, math.leftDen, 'is-left is-compact-orig', {
        numPart: 'left-orig-num',
        denPart: 'left-orig-den',
        denArrowSource: true
      });

      leftPairWrap.appendChild(expandedLeftCard);
      leftPairWrap.appendChild(eqSignLeft);
      leftPairWrap.appendChild(origLeftCard);
      leftCol.appendChild(leftPairWrap);

      // Høyre kolonne: (rightNum × leftDen) / (rightDen × leftDen) [= rightExpandedNum / commonDen]
      const rightCol = document.createElement('div');
      rightCol.className = 'fraction-column';
      const rightLbl = document.createElement('span');
      rightLbl.className = 'fraction-col-label is-right';
      rightLbl.textContent = '2. Utvid andre brøk';
      rightCol.appendChild(rightLbl);

      const rightPairWrap = document.createElement('div');
      rightPairWrap.className = 'fraction-eq-inline';

      const workingRightFrac = createDomFraction(
        createMultiplyExprNode(math.rightNum, math.rightFactor, 'from-left'),
        createMultiplyExprNode(math.rightDen, math.rightFactor, 'from-left'),
        'is-right is-working-frac',
        {
          numPart: 'right-num',
          denPart: 'right-den',
          numArrowTarget: true,
          denArrowTarget: true
        }
      );
      rightPairWrap.appendChild(workingRightFrac);

      if (stepState.rightExpandedDone) {
        const eqSignRight = document.createElement('span');
        eqSignRight.className = 'eq-sign';
        eqSignRight.textContent = '=';
        const solvedRightCard = createDomFraction(
          math.rightExpandedNum,
          math.commonDen,
          'is-right is-expanded-result',
          {}
        );
        rightPairWrap.appendChild(eqSignRight);
        rightPairWrap.appendChild(solvedRightCard);
      }

      rightCol.appendChild(rightPairWrap);

      arena.appendChild(leftCol);
      arena.appendChild(rightCol);
      wrapper.appendChild(arena);

      if (!stepState.rightExpandedDone) {
        const choices = buildExpansionChoices(
          math.rightNum,
          math.rightDen,
          math.rightFactor,
          math.task.id + '-right'
        );
        const quizEl = renderExpansionQuizCard(
          'Nå ganger vi teller og nevner i den andre brøken med <strong>' +
            math.rightFactor +
            '</strong>. Hva får vi?',
          choices,
          function (picked) {
            if (picked.isCorrect) {
              if (callbacks && typeof callbacks.onRightExpandedSolved === 'function') {
                callbacks.onRightExpandedSolved();
              }
            } else if (callbacks && typeof callbacks.onWrongExpansionChoice === 'function') {
              callbacks.onWrongExpansionChoice(picked.hint);
            }
          }
        );
        wrapper.appendChild(quizEl);
      }

      const animateRightBar = stepState.rightExpandedDone && isFreshSignature;
      wrapper.appendChild(
        renderVisualBarsSection(math, stepState, animateRightBar ? 'right' : null)
      );

      containerEl.innerHTML = '';
      containerEl.appendChild(wrapper);

      currentArenaEl = arena;
      currentArrowOverlaySvg = overlaySvg;
      currentStepConfig = {
        direction: 'left-to-right',
        color: '#D97706',
        factor: math.rightFactor
      };
      observeArenaResize(arena);
      requestAnimationFrame(function () {
        repositionArrows(isFreshSignature && !stepState.rightExpandedDone);
      });
      return;
    }

    // --- STEG 5: Sammenlign brøkene med fellesnevner og svar Sant eller Usant ---
    const compareRow = document.createElement('div');
    compareRow.className = 'fraction-comparison-row final-comparison-arena';

    // Venstre brøk med fellesnevner
    const leftFinalCol = document.createElement('div');
    leftFinalCol.className = 'fraction-column';
    const leftFinalLbl = document.createElement('span');
    leftFinalLbl.className = 'fraction-col-label is-left';
    leftFinalLbl.textContent =
      math.fruitMeta.emoji +
      ' ' +
      math.fruitMeta.labelPlural.charAt(0).toUpperCase() +
      math.fruitMeta.labelPlural.slice(1) +
      ' (' +
      math.leftNum +
      '/' +
      math.leftDen +
      ')';
    leftFinalCol.appendChild(leftFinalLbl);

    const leftFinalFrac = createDomFraction(
      math.leftExpandedNum,
      math.commonDen,
      'is-left is-expanded-result is-final-compare',
      {
        numPart: 'final-left-num',
        denPart: 'final-left-den'
      }
    );
    leftFinalFrac.querySelector('[data-part="final-left-num"]').classList.add('is-highlighted-num');
    leftFinalCol.appendChild(leftFinalFrac);

    // Sammenligningssymbol i midten (<, > eller =)
    const cmpCenter = document.createElement('div');
    cmpCenter.className = 'comparison-symbol-box';

    const cmpSign = document.createElement('span');
    cmpSign.className = 'comparison-symbol-char';
    cmpSign.textContent = math.comparisonSymbol;
    cmpSign.setAttribute(
      'aria-label',
      math.comparisonSymbol === '<'
        ? 'er mindre enn'
        : math.comparisonSymbol === '>'
          ? 'er større enn'
          : 'er lik'
    );
    cmpCenter.appendChild(cmpSign);

    const cmpCaption = document.createElement('span');
    cmpCaption.className = 'comparison-symbol-caption';
    cmpCaption.textContent =
      math.leftExpandedNum +
      ' biter ' +
      (math.leftExpandedNum < math.rightExpandedNum
        ? 'er færre enn'
        : math.leftExpandedNum > math.rightExpandedNum
          ? 'er flere enn'
          : 'er like mange som') +
      ' ' +
      math.rightExpandedNum +
      ' biter';
    cmpCenter.appendChild(cmpCaption);

    // Høyre brøk med fellesnevner
    const rightFinalCol = document.createElement('div');
    rightFinalCol.className = 'fraction-column';
    const rightFinalLbl = document.createElement('span');
    rightFinalLbl.className = 'fraction-col-label is-right';
    rightFinalLbl.textContent = 'Påstand (' + math.rightNum + '/' + math.rightDen + ')';
    rightFinalCol.appendChild(rightFinalLbl);

    const rightFinalFrac = createDomFraction(
      math.rightExpandedNum,
      math.commonDen,
      'is-right is-expanded-result is-final-compare',
      {
        numPart: 'final-right-num',
        denPart: 'final-right-den'
      }
    );
    rightFinalFrac
      .querySelector('[data-part="final-right-num"]')
      .classList.add('is-highlighted-num');
    rightFinalCol.appendChild(rightFinalFrac);

    compareRow.appendChild(leftFinalCol);
    compareRow.appendChild(cmpCenter);
    compareRow.appendChild(rightFinalCol);
    wrapper.appendChild(compareRow);

    // Visuelle brøkstaver med lik inndeling
    wrapper.appendChild(renderVisualBarsSection(math, stepState, null));

    // Sant / Usant svarkort
    const isSolved = stepState.finalAnswer === math.isTrue;
    const answerCard = document.createElement('div');
    answerCard.className = 'final-answer-card' + (isSolved ? ' is-solved' : '');

    const answerQuestion = document.createElement('p');
    answerQuestion.className = 'final-answer-prompt';
    answerQuestion.innerHTML =
      'Påstanden var: <strong>«' +
      math.operatorText +
      ' ' +
      math.rightNum +
      '/' +
      math.rightDen +
      ' av fruktene på fatet er ' +
      math.fruitMeta.labelPlural +
      '.»</strong> Er det sant eller usant?';
    answerCard.appendChild(answerQuestion);

    const btnRow = document.createElement('div');
    btnRow.className = 'guess-btn-row';

    const btnTrue = document.createElement('button');
    btnTrue.type = 'button';
    btnTrue.setAttribute('data-final-answer', 'true');
    btnTrue.className =
      'btn-choice-big' +
      (stepState.finalAnswer === true
        ? math.isTrue
          ? ' is-correct-final'
          : ' is-wrong-final'
        : '');
    btnTrue.textContent = '✅ SANT';
    btnTrue.addEventListener('click', function () {
      if (callbacks && typeof callbacks.onFinalAnswer === 'function') {
        callbacks.onFinalAnswer(true);
      }
    });

    const btnFalse = document.createElement('button');
    btnFalse.type = 'button';
    btnFalse.setAttribute('data-final-answer', 'false');
    btnFalse.className =
      'btn-choice-big' +
      (stepState.finalAnswer === false
        ? !math.isTrue
          ? ' is-correct-final'
          : ' is-wrong-final'
        : '');
    btnFalse.textContent = '❌ USANT';
    btnFalse.addEventListener('click', function () {
      if (callbacks && typeof callbacks.onFinalAnswer === 'function') {
        callbacks.onFinalAnswer(false);
      }
    });

    btnRow.appendChild(btnTrue);
    btnRow.appendChild(btnFalse);
    answerCard.appendChild(btnRow);
    wrapper.appendChild(answerCard);

    // Pedagogisk oppsummering og sammenligning mot startgjetting når oppgaven er løst
    if (isSolved) {
      const summaryBox = document.createElement('div');
      summaryBox.className = 'final-summary-card';

      const badge = document.createElement('div');
      badge.className = 'celebration-calm-badge';
      badge.textContent = '🌟 Oppgave løst! Påstanden er ' + (math.isTrue ? 'SANN' : 'USANN') + '!';
      summaryBox.appendChild(badge);

      const relationWords =
        math.leftExpandedNum < math.rightExpandedNum
          ? 'mindre enn'
          : math.leftExpandedNum > math.rightExpandedNum
            ? 'mer enn'
            : 'akkurat lik';

      const explanationP = document.createElement('p');
      explanationP.className = 'summary-explanation-text';
      explanationP.innerHTML =
        'Vi telte opp <strong>' +
        math.leftNum +
        '/' +
        math.leftDen +
        '</strong> ' +
        math.fruitMeta.labelPlural +
        ' og gjorde om begge brøkene til <strong>' +
        math.commonDen +
        '-deler</strong>: ' +
        '<strong>' +
        math.leftExpandedNum +
        '/' +
        math.commonDen +
        '</strong> mot <strong>' +
        math.rightExpandedNum +
        '/' +
        math.commonDen +
        '</strong>. Siden <strong>' +
        math.leftExpandedNum +
        ' biter</strong> er ' +
        relationWords +
        ' <strong>' +
        math.rightExpandedNum +
        ' biter</strong>, blir påstanden om «' +
        math.operatorLower +
        ' ' +
        math.rightNum +
        '/' +
        math.rightDen +
        '» <strong>' +
        (math.isTrue ? 'sann' : 'usann') +
        '</strong>!';
      summaryBox.appendChild(explanationP);

      const guessNote = document.createElement('p');
      guessNote.className = 'summary-guess-reflection';
      if (stepState.initialGuess === null) {
        guessNote.textContent =
          '💡 Med fellesnevner slapp vi å gjette – vi kunne sammenligne tellerne ' +
          math.leftExpandedNum +
          ' og ' +
          math.rightExpandedNum +
          ' direkte!';
      } else if (stepState.initialGuess === math.isTrue) {
        guessNote.textContent =
          '🎯 Blinkskudd! I starten gjettet du «' +
          (stepState.initialGuess ? 'Sant' : 'Usant') +
          '», og regnestykket beviste at magefølelsen din hadde helt rett!';
      } else {
        guessNote.textContent =
          '💡 I starten gjettet du «' +
          (stepState.initialGuess ? 'Sant' : 'Usant') +
          '». Brøker som ' +
          math.leftNum +
          '/' +
          math.leftDen +
          ' og ' +
          math.rightNum +
          '/' +
          math.rightDen +
          ' er veldig lette å bli lurt av med øyemål – derfor er fellesnevner så nyttig!';
      }
      summaryBox.appendChild(guessNote);

      // Hurtigknapper til ekstraoppgaver
      const allTasks = window.BrokApp.TASKS || [];
      const completedIds = (window.BrokApp.state && window.BrokApp.state.completedTaskIds) || [];
      const remainingTasks = [];
      allTasks.forEach(function (t, idx) {
        if (t.id !== math.task.id && completedIds.indexOf(t.id) === -1) {
          remainingTasks.push({ task: t, index: idx });
        }
      });

      if (remainingTasks.length > 0) {
        const extraRow = document.createElement('div');
        extraRow.className = 'extra-tasks-cta-row';

        const extraLabel = document.createElement('span');
        extraLabel.className = 'extra-tasks-cta-label';
        extraLabel.textContent = 'Prøv en oppgave til på fruktfatet:';
        extraRow.appendChild(extraLabel);

        remainingTasks.forEach(function (entry) {
          const nextBtn = document.createElement('button');
          nextBtn.type = 'button';
          nextBtn.className = 'btn btn-amber btn-extra-task';
          nextBtn.textContent = entry.task.emoji + ' ' + entry.task.title;
          nextBtn.addEventListener('click', function () {
            if (callbacks && typeof callbacks.onSelectNextTask === 'function') {
              callbacks.onSelectNextTask(entry.index);
            }
          });
          extraRow.appendChild(nextBtn);
        });

        summaryBox.appendChild(extraRow);
      }

      wrapper.appendChild(summaryBox);
    }

    containerEl.innerHTML = '';
    containerEl.appendChild(wrapper);
  }

  window.addEventListener('resize', function () {
    repositionArrows(false);
  });

  window.BrokApp.FractionAnimator = {
    renderStage: renderStage,
    repositionArrows: repositionArrows,
    replayAnimation: replayAnimation
  };
})();
