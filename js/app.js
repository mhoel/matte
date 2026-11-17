(function () {
  'use strict';

  window.BrokApp = window.BrokApp || {};

  const FRUITS = window.BrokApp.FRUITS;
  const FRUIT_META = window.BrokApp.FRUIT_META;
  const TASKS = window.BrokApp.TASKS;
  const deriveTaskMath = window.BrokApp.deriveTaskMath;

  const state = {
    currentTaskIndex: 0,
    step: 0,                  // 0..5
    maxReachedStep: 0,        // høyeste steg nådd i aktiv oppgave
    initialGuess: null,       // boolean | null
    countedTargetIds: [],     // klikkede målfrukter i steg 1
    countedAllIds: [],        // klikkede frukter totalt i steg 2
    leftExpandedDone: false,  // om venstre brøk er utvidet i steg 3
    rightExpandedDone: false, // om høyre brøk er utvidet i steg 4
    finalAnswer: null,        // boolean | null i steg 5
    completedTaskIds: [],     // løste oppgaver i økten
    feedback: null,           // { type: 'info'|'success'|'warn', message: string } | null
    autoCountTimer: null
  };

  const els = {};

  function cacheElements() {
    els.completedBadge = document.getElementById('tasks-completed-badge');
    els.taskTabs = document.getElementById('task-tabs');
    els.statementText = document.getElementById('statement-text');
    els.guessSummaryPill = document.getElementById('guess-summary-pill');
    els.stepStepper = document.getElementById('step-stepper');
    els.guideTitle = document.getElementById('guide-title');
    els.guideText = document.getElementById('guide-text');
    els.feedbackBanner = document.getElementById('feedback-banner');
    els.fruitPanelHeading = document.getElementById('fruit-panel-heading');
    els.fruitCounterPill = document.getElementById('fruit-counter-pill');
    els.fruitBowlContainer = document.getElementById('fruit-bowl-container');
    els.fruitLegend = document.getElementById('fruit-legend');
    els.fruitActions = document.getElementById('fruit-actions');
    els.mathPanelHeading = document.getElementById('math-panel-heading');
    els.btnReplayAnim = document.getElementById('btn-replay-anim');
    els.mathStageContainer = document.getElementById('math-stage-container');
    els.btnPrev = document.getElementById('btn-prev');
    els.btnReset = document.getElementById('btn-reset');
    els.btnNext = document.getElementById('btn-next');
    els.navHint = document.getElementById('nav-hint');
  }

  function getActiveTask() {
    return TASKS[state.currentTaskIndex];
  }

  function getActiveMath() {
    return deriveTaskMath(getActiveTask(), FRUITS);
  }

  function clearAutoCountTimer() {
    if (state.autoCountTimer) {
      clearInterval(state.autoCountTimer);
      state.autoCountTimer = null;
    }
  }

  function resetTaskProgress(keepTaskIndex) {
    clearAutoCountTimer();
    if (window.BrokApp.Confetti && typeof window.BrokApp.Confetti.stop === 'function') {
      window.BrokApp.Confetti.stop();
    }
    if (typeof keepTaskIndex === 'number') {
      state.currentTaskIndex = keepTaskIndex;
    }
    state.step = 0;
    state.maxReachedStep = 0;
    state.initialGuess = null;
    state.countedTargetIds = [];
    state.countedAllIds = [];
    state.leftExpandedDone = false;
    state.rightExpandedDone = false;
    state.finalAnswer = null;
    state.feedback = null;
  }

  function formatInlineFrac(num, den) {
    return (
      '<span class="inline-frac" aria-label="' +
      num +
      ' over ' +
      den +
      '"><span>' +
      num +
      '</span><span>' +
      den +
      '</span></span>'
    );
  }

  function formatStatementHtml(math) {
    return (
      '«' +
      math.operatorText +
      ' ' +
      formatInlineFrac(math.rightNum, math.rightDen) +
      ' av fruktene på fatet er ' +
      math.fruitMeta.labelPlural +
      '.»'
    );
  }

  function isStepReadyToAdvance(step, math) {
    switch (step) {
      case 0:
        // Startgjetting er frivillig, men oppmuntret
        return true;
      case 1:
        return state.countedTargetIds.length === math.leftNum;
      case 2:
        return state.countedAllIds.length === math.leftDen;
      case 3:
        return state.leftExpandedDone;
      case 4:
        return state.rightExpandedDone;
      case 5:
        return state.finalAnswer === math.isTrue;
      default:
        return false;
    }
  }

  function ensurePriorStepsStateForStep(targetStep, math) {
    if (targetStep >= 2 && state.countedTargetIds.length < math.leftNum) {
      state.countedTargetIds = math.targetFruitIds.slice();
    }
    if (targetStep >= 3 && state.countedAllIds.length < math.leftDen) {
      state.countedAllIds = FRUITS.map(function (f) {
        return f.id;
      });
    }
    if (targetStep >= 4) {
      state.leftExpandedDone = true;
    }
    if (targetStep >= 5) {
      state.rightExpandedDone = true;
    }
  }

  function goToStep(newStep) {
    const math = getActiveMath();
    if (newStep < 0 || newStep > 5) {
      return;
    }
    clearAutoCountTimer();
    ensurePriorStepsStateForStep(newStep, math);
    state.step = newStep;
    if (newStep > state.maxReachedStep) {
      state.maxReachedStep = newStep;
    }
    state.feedback = null;
    renderAll();
  }

  function setFeedback(type, message) {
    state.feedback = message ? { type: type, message: message } : null;
    renderFeedback();
  }

  function getStepLabels(math) {
    return [
      'Gjett først',
      'Tell ' + math.fruitMeta.labelPlural,
      'Tell all frukt',
      'Utvid 1. brøk',
      'Utvid 2. brøk',
      'Sammenlign'
    ];
  }

  function getGuideCopy(step, math) {
    const plural = math.fruitMeta.labelPlural;
    const defPlural = math.fruitMeta.labelDefinitePlural;

    switch (step) {
      case 0:
        return {
          title: 'Steg 1: Hva tror du før vi regner?',
          text:
            'Se på fruktfatet under! Tror du det er sant eller usant at ' +
            math.operatorLower +
            ' ' +
            math.rightNum +
            '/' +
            math.rightDen +
            ' av fruktene er ' +
            plural +
            '? Gjett gjerne først, og trykk deretter «Neste steg» for å sjekke med brøkregning!'
        };
      case 1:
        return {
          title: 'Steg 2: Tell hvor mange ' + plural + ' det er (teller)',
          text:
            'Først finner vi telleren (tallet øverst i brøken). Klikk på alle ' +
            defPlural +
            ' på fatet for å telle dem opp!'
        };
      case 2:
        return {
          title: 'Steg 3: Tell alle fruktene på fatet (nevner)',
          text:
            'Flott, det er ' +
            math.leftNum +
            ' ' +
            (math.leftNum === 1 ? math.fruitMeta.labelSingular : plural) +
            '! Nå finner vi nevneren (tallet nederst i brøken) ved å telle absolutt alle fruktene på fatet.'
        };
      case 3:
        return {
          title: 'Steg 4: Gjør om første brøk til fellesnevner',
          text:
            'Det er vanskelig å sammenligne ' +
            math.leftNum +
            '/' +
            math.leftDen +
            ' og ' +
            math.rightNum +
            '/' +
            math.rightDen +
            ' når bitene har ulik størrelse. Trikset er å ta nevneren i den andre brøken (' +
            math.rightDen +
            ') og gange med både teller og nevner i ' +
            math.leftNum +
            '/' +
            math.leftDen +
            '!'
        };
      case 4:
        return {
          title: 'Steg 5: Gjør om andre brøk til samme fellesnevner',
          text:
            'Nå gjør vi akkurat det samme motsatt vei! Vi tar den opprinnelige nevneren fra første brøk (' +
            math.leftDen +
            ') og ganger med både teller og nevner i ' +
            math.rightNum +
            '/' +
            math.rightDen +
            '.'
        };
      case 5:
        return {
          title: 'Steg 6: Sammenlign brøkene og svar på påstanden!',
          text:
            'Se så lett det ble nå som begge brøkene er delt i ' +
            math.commonDen +
            '-deler! Sammenlign ' +
            math.leftExpandedNum +
            '/' +
            math.commonDen +
            ' og ' +
            math.rightExpandedNum +
            '/' +
            math.commonDen +
            ', og svar på om påstanden er sann eller usann.'
        };
      default:
        return { title: '', text: '' };
    }
  }

  function renderHeaderAndTabs() {
    els.completedBadge.textContent =
      state.completedTaskIds.length + ' av ' + TASKS.length + ' oppgaver løst';

    els.taskTabs.innerHTML = '';
    TASKS.forEach(function (task, index) {
      const btn = document.createElement('button');
      btn.type = 'button';
      const isActive = index === state.currentTaskIndex;
      const isCompleted = state.completedTaskIds.indexOf(task.id) !== -1;

      btn.className =
        'task-tab' +
        (isActive ? ' is-active' : '') +
        (isCompleted ? ' is-completed' : '');
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');

      const emojiSpan = document.createElement('span');
      emojiSpan.setAttribute('aria-hidden', 'true');
      emojiSpan.textContent = task.emoji;
      btn.appendChild(emojiSpan);

      const titleSpan = document.createElement('span');
      titleSpan.textContent = task.title;
      btn.appendChild(titleSpan);

      if (isCompleted) {
        const checkSpan = document.createElement('span');
        checkSpan.className = 'task-tab-check';
        checkSpan.setAttribute('aria-label', 'Fullført');
        checkSpan.textContent = '✓';
        btn.appendChild(checkSpan);
      }

      btn.addEventListener('click', function () {
        if (index !== state.currentTaskIndex) {
          resetTaskProgress(index);
          renderAll();
        }
      });

      els.taskTabs.appendChild(btn);
    });
  }

  function renderStatementAndStepper(math) {
    els.statementText.innerHTML = formatStatementHtml(math);

    if (state.initialGuess === null) {
      els.guessSummaryPill.classList.add('hidden');
      els.guessSummaryPill.textContent = '';
    } else {
      els.guessSummaryPill.classList.remove('hidden');
      els.guessSummaryPill.textContent =
        'Startgjetting: ' + (state.initialGuess ? 'Sant' : 'Usant');
    }

    const labels = getStepLabels(math);
    els.stepStepper.innerHTML = '';

    labels.forEach(function (label, idx) {
      const li = document.createElement('li');
      const isCurrent = idx === state.step;
      const isDone = idx < state.step || (idx === 5 && state.finalAnswer === math.isTrue);

      li.className =
        'step-item' +
        (isCurrent ? ' is-current' : '') +
        (isDone && !isCurrent ? ' is-done' : '');

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'step-btn';
      const canJump = idx <= state.maxReachedStep || (idx === state.step + 1 && isStepReadyToAdvance(state.step, math));
      btn.disabled = !canJump;
      if (isCurrent) {
        btn.setAttribute('aria-current', 'step');
      }

      const circle = document.createElement('span');
      circle.className = 'step-num-circle';
      circle.textContent = isDone && !isCurrent ? '✓' : String(idx + 1);

      const text = document.createElement('span');
      text.textContent = label;

      btn.appendChild(circle);
      btn.appendChild(text);

      btn.addEventListener('click', function () {
        if (!btn.disabled && idx !== state.step) {
          goToStep(idx);
        }
      });

      li.appendChild(btn);
      els.stepStepper.appendChild(li);
    });
  }

  function renderFeedback() {
    if (!state.feedback) {
      els.feedbackBanner.classList.add('hidden');
      els.feedbackBanner.textContent = '';
      els.feedbackBanner.className = 'feedback-banner hidden';
      return;
    }
    els.feedbackBanner.className = 'feedback-banner is-' + state.feedback.type;
    els.feedbackBanner.textContent = state.feedback.message;
  }

  function renderGuide(math) {
    const copy = getGuideCopy(state.step, math);
    els.guideTitle.textContent = copy.title;
    els.guideText.textContent = copy.text;
    renderFeedback();
  }

  function renderFruitLegend(math) {
    const counts = { banana: 0, apple: 0, orange: 0, pear: 0 };
    FRUITS.forEach(function (f) {
      counts[f.type] = (counts[f.type] || 0) + 1;
    });

    els.fruitLegend.innerHTML = '';
    ['banana', 'apple', 'orange', 'pear'].forEach(function (type) {
      const meta = FRUIT_META[type];
      const count = counts[type];
      const chip = document.createElement('span');
      chip.className =
        'legend-chip' + (type === math.task.targetFruit ? ' is-target' : '');

      const showExactCount = state.step >= 2 || (state.step === 1 && type === math.task.targetFruit && state.countedTargetIds.length === math.leftNum);
      chip.textContent =
        meta.emoji +
        ' ' +
        (showExactCount
          ? count + ' ' + (count === 1 ? meta.labelSingular : meta.labelPlural)
          : meta.labelPlural.charAt(0).toUpperCase() + meta.labelPlural.slice(1));
      els.fruitLegend.appendChild(chip);
    });
  }

  function handleFruitClick(fruit) {
    const math = getActiveMath();
    if (state.step === 0) {
      setFeedback('info', 'Gjett gjerne «Sant» eller «Usant» til høyre, eller klikk «Neste steg» for å begynne å telle!');
      return;
    }

    if (state.step === 1) {
      if (fruit.type !== math.task.targetFruit) {
        setFeedback(
          'warn',
          'Hopp over ' +
            fruit.labelSingular +
            ' nå! I dette steget teller vi bare ' +
            math.fruitMeta.labelPlural +
            '.'
        );
        return;
      }
      if (state.countedTargetIds.indexOf(fruit.id) === -1) {
        state.countedTargetIds.push(fruit.id);
        if (state.countedTargetIds.length === math.leftNum) {
          setFeedback(
            'success',
            'Supert! Du telte ' +
              math.leftNum +
              ' ' +
              (math.leftNum === 1 ? math.fruitMeta.labelSingular : math.fruitMeta.labelPlural) +
              '. Tallet ' +
              math.leftNum +
              ' er telleren vår!'
          );
        } else {
          setFeedback(
            'info',
            'Bra! ' +
              state.countedTargetIds.length +
              ' av ' +
              math.leftNum +
              ' ' +
              math.fruitMeta.labelPlural +
              ' telt opp.'
          );
        }
        renderAll();
      }
      return;
    }

    if (state.step === 2) {
      if (state.countedAllIds.indexOf(fruit.id) === -1) {
        state.countedAllIds.push(fruit.id);
        if (state.countedAllIds.length === math.leftDen) {
          setFeedback(
            'success',
            'Perfekt! Det er ' +
              math.leftDen +
              ' frukter til sammen på fatet. Brøken vår er ' +
              math.leftNum +
              '/' +
              math.leftDen +
              '!'
          );
        } else {
          setFeedback(
            'info',
            'Telt ' + state.countedAllIds.length + ' av ' + math.leftDen + ' frukter...'
          );
        }
        renderAll();
      }
    }
  }

  function runAutoCount(idsToCount, targetArrayName, onCompleteMessage) {
    clearAutoCountTimer();
    const remaining = idsToCount.filter(function (id) {
      return state[targetArrayName].indexOf(id) === -1;
    });

    if (remaining.length === 0) {
      return;
    }

    const prefersReducedMotion =
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      remaining.forEach(function (id) {
        state[targetArrayName].push(id);
      });
      setFeedback('success', onCompleteMessage);
      renderAll();
      return;
    }

    let i = 0;
    state.autoCountTimer = setInterval(function () {
      if (i < remaining.length) {
        state[targetArrayName].push(remaining[i]);
        i += 1;
        if (i === remaining.length) {
          clearAutoCountTimer();
          setFeedback('success', onCompleteMessage);
        }
        renderAll();
      } else {
        clearAutoCountTimer();
      }
    }, 130);
  }

  function renderFruitSection(math) {
    // Counter pill
    if (state.step === 1) {
      els.fruitCounterPill.textContent =
        'Telt ' +
        math.fruitMeta.labelPlural +
        ': ' +
        state.countedTargetIds.length +
        ' av ' +
        math.leftNum;
    } else if (state.step === 2) {
      els.fruitCounterPill.textContent =
        'Telt alle frukter: ' + state.countedAllIds.length + ' av ' + math.leftDen;
    } else {
      els.fruitCounterPill.textContent =
        math.leftNum +
        ' ' +
        (math.leftNum === 1 ? math.fruitMeta.labelSingular : math.fruitMeta.labelPlural) +
        ' av ' +
        math.leftDen +
        ' frukter';
    }

    // Render SVG bowl if module loaded, otherwise fallback list
    let bowlMode = 'overview';
    let countedIds = [];
    if (state.step === 1) {
      bowlMode = 'count-target';
      countedIds = state.countedTargetIds;
    } else if (state.step === 2) {
      bowlMode = 'count-all';
      countedIds = state.countedAllIds;
    } else if (state.step >= 3) {
      bowlMode = 'summary';
      countedIds = math.targetFruitIds;
    }

    if (window.BrokApp.FruitBowl && typeof window.BrokApp.FruitBowl.render === 'function') {
      window.BrokApp.FruitBowl.render(
        els.fruitBowlContainer,
        FRUITS,
        {
          mode: bowlMode,
          targetFruit: math.task.targetFruit,
          countedIds: countedIds
        },
        handleFruitClick
      );
    } else {
      els.fruitBowlContainer.innerHTML =
        '<p class="stage-card-desc">Fruktfat med 3 bananer, 2 epler, 4 appelsiner og 1 pære.</p>';
    }

    renderFruitLegend(math);

    // Quick-count buttons in step 1 and 2
    els.fruitActions.innerHTML = '';
    if (state.step === 1 && state.countedTargetIds.length < math.leftNum) {
      const btnAutoTarget = document.createElement('button');
      btnAutoTarget.type = 'button';
      btnAutoTarget.className = 'btn btn-amber';
      btnAutoTarget.textContent =
        state.countedTargetIds.length === 0
          ? 'Tell ' + math.fruitMeta.labelDefinitePlural + ' for meg'
          : 'Tell resten (' + (math.leftNum - state.countedTargetIds.length) + ')';
      btnAutoTarget.addEventListener('click', function () {
        runAutoCount(
          math.targetFruitIds,
          'countedTargetIds',
          'Supert! Det er ' +
            math.leftNum +
            ' ' +
            (math.leftNum === 1 ? math.fruitMeta.labelSingular : math.fruitMeta.labelPlural) +
            ' på fatet.'
        );
      });
      els.fruitActions.appendChild(btnAutoTarget);
    } else if (state.step === 2 && state.countedAllIds.length < math.leftDen) {
      const btnAutoAll = document.createElement('button');
      btnAutoAll.type = 'button';
      btnAutoAll.className = 'btn btn-amber';
      btnAutoAll.textContent =
        state.countedAllIds.length === 0
          ? 'Tell alle 10 fruktene for meg'
          : 'Tell resten (' + (math.leftDen - state.countedAllIds.length) + ')';
      btnAutoAll.addEventListener('click', function () {
        runAutoCount(
          FRUITS.map(function (f) {
            return f.id;
          }),
          'countedAllIds',
          'Perfekt! Det er ' +
            math.leftDen +
            ' frukter til sammen, så brøken blir ' +
            math.leftNum +
            '/' +
            math.leftDen +
            '.'
        );
      });
      els.fruitActions.appendChild(btnAutoAll);
    }
  }

  function renderStepZeroGuessStage(math) {
    const box = document.createElement('div');
    box.className = 'stage-card-box';

    const title = document.createElement('h4');
    title.className = 'stage-card-title';
    title.textContent = 'Hva tror magefølelsen din?';
    box.appendChild(title);

    const desc = document.createElement('p');
    desc.className = 'stage-card-desc';
    desc.innerHTML =
      'Er det <strong>sant</strong> eller <strong>usant</strong> at ' +
      math.operatorLower +
      ' ' +
      formatInlineFrac(math.rightNum, math.rightDen) +
      ' av fruktene på fatet er ' +
      math.fruitMeta.labelPlural +
      '?';
    box.appendChild(desc);

    const row = document.createElement('div');
    row.className = 'guess-btn-row';

    const btnTrue = document.createElement('button');
    btnTrue.type = 'button';
    btnTrue.className =
      'btn-choice-big' + (state.initialGuess === true ? ' is-selected-true' : '');
    btnTrue.textContent = '👍 Jeg tror SANT';
    btnTrue.setAttribute('aria-pressed', state.initialGuess === true ? 'true' : 'false');
    btnTrue.addEventListener('click', function () {
      state.initialGuess = true;
      setFeedback(
        'info',
        'Spennende! Du gjettet SANT. Klikk «Neste steg» for å finne ut om det stemmer!'
      );
      renderAll();
    });

    const btnFalse = document.createElement('button');
    btnFalse.type = 'button';
    btnFalse.className =
      'btn-choice-big' + (state.initialGuess === false ? ' is-selected-false' : '');
    btnFalse.textContent = '👎 Jeg tror USANT';
    btnFalse.setAttribute('aria-pressed', state.initialGuess === false ? 'true' : 'false');
    btnFalse.addEventListener('click', function () {
      state.initialGuess = false;
      setFeedback(
        'info',
        'Spennende! Du gjettet USANT. Klikk «Neste steg» for å finne ut om det stemmer!'
      );
      renderAll();
    });

    row.appendChild(btnTrue);
    row.appendChild(btnFalse);
    box.appendChild(row);

    els.mathStageContainer.innerHTML = '';
    els.mathStageContainer.appendChild(box);
  }

  function markActiveTaskCompleted() {
    const task = getActiveTask();
    if (state.completedTaskIds.indexOf(task.id) === -1) {
      state.completedTaskIds.push(task.id);
    }
  }

  function renderCountingStageFallback(math) {
    const wrap = document.createElement('div');
    wrap.className = 'counting-stage-wrap';

    const row = document.createElement('div');
    row.className = 'fraction-comparison-row';

    // Venstre brøk (fruktfat-brøken som bygges opp i steg 1 og 2)
    const leftCol = document.createElement('div');
    leftCol.className = 'fraction-column';

    const leftLabel = document.createElement('span');
    leftLabel.className = 'fraction-col-label is-left';
    leftLabel.textContent =
      math.fruitMeta.emoji +
      ' ' +
      math.fruitMeta.labelPlural.charAt(0).toUpperCase() +
      math.fruitMeta.labelPlural.slice(1) +
      ' på fatet';
    leftCol.appendChild(leftLabel);

    const leftFrac = document.createElement('div');
    leftFrac.className = 'fraction-big is-left';

    const leftNumEl = document.createElement('span');
    const targetCount = state.countedTargetIds.length;
    if (state.step === 1) {
      if (targetCount === 0) {
        leftNumEl.className = 'frac-part is-placeholder is-active-slot';
        leftNumEl.textContent = '?';
      } else if (targetCount < math.leftNum) {
        leftNumEl.className = 'frac-part is-active-slot';
        leftNumEl.textContent = String(targetCount);
      } else {
        leftNumEl.className = 'frac-part is-complete-slot';
        leftNumEl.textContent = String(math.leftNum);
      }
    } else {
      leftNumEl.className = 'frac-part';
      leftNumEl.textContent = String(math.leftNum);
    }
    leftNumEl.setAttribute('data-part', 'left-num');

    const leftDiv = document.createElement('span');
    leftDiv.className = 'frac-divider';

    const leftDenEl = document.createElement('span');
    const allCount = state.countedAllIds.length;
    if (state.step === 1) {
      leftDenEl.className = 'frac-part is-placeholder';
      leftDenEl.textContent = '?';
    } else if (state.step === 2) {
      if (allCount === 0) {
        leftDenEl.className = 'frac-part is-placeholder is-active-slot';
        leftDenEl.textContent = '?';
      } else if (allCount < math.leftDen) {
        leftDenEl.className = 'frac-part is-active-slot';
        leftDenEl.textContent = String(allCount);
      } else {
        leftDenEl.className = 'frac-part is-complete-slot';
        leftDenEl.textContent = String(math.leftDen);
      }
    } else {
      leftDenEl.className = 'frac-part';
      leftDenEl.textContent = String(math.leftDen);
    }
    leftDenEl.setAttribute('data-part', 'left-den');

    leftFrac.appendChild(leftNumEl);
    leftFrac.appendChild(leftDiv);
    leftFrac.appendChild(leftDenEl);
    leftCol.appendChild(leftFrac);

    // Midtmerke ("mot")
    const vs = document.createElement('div');
    vs.className = 'vs-badge';
    vs.textContent = 'mot';

    // Høyre brøk (sammenligningsbrøken fra påstanden)
    const rightCol = document.createElement('div');
    rightCol.className = 'fraction-column';

    const rightLabel = document.createElement('span');
    rightLabel.className = 'fraction-col-label is-right';
    rightLabel.textContent = 'Påstandens brøk';
    rightCol.appendChild(rightLabel);

    const rightFrac = document.createElement('div');
    rightFrac.className = 'fraction-big is-right';

    const rightNumEl = document.createElement('span');
    rightNumEl.className = 'frac-part';
    rightNumEl.setAttribute('data-part', 'right-num');
    rightNumEl.textContent = String(math.rightNum);

    const rightDiv = document.createElement('span');
    rightDiv.className = 'frac-divider';

    const rightDenEl = document.createElement('span');
    rightDenEl.className = 'frac-part';
    rightDenEl.setAttribute('data-part', 'right-den');
    rightDenEl.textContent = String(math.rightDen);

    rightFrac.appendChild(rightNumEl);
    rightFrac.appendChild(rightDiv);
    rightFrac.appendChild(rightDenEl);
    rightCol.appendChild(rightFrac);

    row.appendChild(leftCol);
    row.appendChild(vs);
    row.appendChild(rightCol);
    wrap.appendChild(row);

    const note = document.createElement('p');
    note.className = 'counting-explain-note';
    if (state.step === 1) {
      note.textContent =
        targetCount < math.leftNum
          ? 'Klikk på ' +
            math.fruitMeta.labelDefinitePlural +
            ' på fatet for å fylle inn telleren øverst!'
          : 'Telleren er ' +
            math.leftNum +
            '! Klikk «Neste steg» for å telle alle fruktene (nevneren).';
    } else if (state.step === 2) {
      note.textContent =
        allCount < math.leftDen
          ? 'Klikk på alle fruktene på fatet for å fylle inn nevneren nederst!'
          : 'Vi har brøken ' +
            math.leftNum +
            '/' +
            math.leftDen +
            ' mot ' +
            math.rightNum +
            '/' +
            math.rightDen +
            '. Klikk «Neste steg» for å finne fellesnevner!';
    }
    wrap.appendChild(note);

    els.mathStageContainer.innerHTML = '';
    els.mathStageContainer.appendChild(wrap);
  }

  function renderMathSection(math) {
    const showReplay =
      (state.step === 3 || state.step === 4) &&
      window.BrokApp.FractionAnimator &&
      typeof window.BrokApp.FractionAnimator.replayAnimation === 'function';

    if (showReplay) {
      els.btnReplayAnim.classList.remove('hidden');
    } else {
      els.btnReplayAnim.classList.add('hidden');
    }

    if (state.step === 0) {
      renderStepZeroGuessStage(math);
      return;
    }

    if (state.step === 1) {
      renderCountingStageFallback(math);
      return;
    }

    if (
      window.BrokApp.FractionAnimator &&
      typeof window.BrokApp.FractionAnimator.renderStage === 'function'
    ) {
      window.BrokApp.FractionAnimator.renderStage(
        els.mathStageContainer,
        math,
        {
          step: state.step,
          initialGuess: state.initialGuess,
          countedTargetCount: state.countedTargetIds.length,
          countedAllCount: state.countedAllIds.length,
          leftExpandedDone: state.leftExpandedDone,
          rightExpandedDone: state.rightExpandedDone,
          finalAnswer: state.finalAnswer
        },
        {
          onLeftExpandedSolved: function () {
            state.leftExpandedDone = true;
            setFeedback(
              'success',
              'Riktig! ' +
                math.leftNum +
                '/' +
                math.leftDen +
                ' er akkurat like mye som ' +
                math.leftExpandedNum +
                '/' +
                math.commonDen +
                '. Se hvordan brøkstaven fikk mindre biter uten å endre lengde!'
            );
            renderAll();
          },
          onRightExpandedSolved: function () {
            state.rightExpandedDone = true;
            setFeedback(
              'success',
              'Blinkskudd! ' +
                math.rightNum +
                '/' +
                math.rightDen +
                ' er akkurat like mye som ' +
                math.rightExpandedNum +
                '/' +
                math.commonDen +
                '. Nå har begge brøkene nevneren ' +
                math.commonDen +
                '!'
            );
            renderAll();
          },
          onWrongExpansionChoice: function (hintMessage) {
            setFeedback('warn', hintMessage);
          },
          onFinalAnswer: function (chosenBool) {
            state.finalAnswer = chosenBool;
            if (chosenBool === math.isTrue) {
              markActiveTaskCompleted();
              setFeedback(
                'success',
                'Hurra, helt riktig! Siden ' +
                  math.leftExpandedNum +
                  '/' +
                  math.commonDen +
                  ' ' +
                  math.comparisonSymbol +
                  ' ' +
                  math.rightExpandedNum +
                  '/' +
                  math.commonDen +
                  ', er påstanden ' +
                  (math.isTrue ? 'SANN' : 'USANN') +
                  '!'
              );
              if (
                window.BrokApp.Confetti &&
                typeof window.BrokApp.Confetti.burst === 'function'
              ) {
                window.BrokApp.Confetti.burst();
              }
            } else {
              setFeedback(
                'warn',
                'Nesten! Se på tellerne øverst: vi har ' +
                  math.leftExpandedNum +
                  ' biter for ' +
                  math.fruitMeta.labelPlural +
                  ' mot ' +
                  math.rightExpandedNum +
                  ' biter for ' +
                  math.rightNum +
                  '/' +
                  math.rightDen +
                  '. Er ' +
                  math.leftExpandedNum +
                  ' ' +
                  math.operatorLower +
                  ' ' +
                  math.rightExpandedNum +
                  '? Prøv igjen!'
              );
            }
            renderAll();
          },
          onSelectNextTask: function (nextIndex) {
            resetTaskProgress(nextIndex);
            renderAll();
          }
        }
      );
    } else if (state.step === 2) {
      renderCountingStageFallback(math);
    } else {
      // Fallback-visning mens steg 3 bygges
      const box = document.createElement('div');
      box.className = 'stage-card-box';
      box.innerHTML =
        '<h4 class="stage-card-title">Brøkoversikt</h4>' +
        '<p class="stage-card-desc">Fruktbrøk: <strong>' +
        math.leftNum +
        '/' +
        math.leftDen +
        '</strong> mot <strong>' +
        math.rightNum +
        '/' +
        math.rightDen +
        '</strong> → Fellesnevner: <strong>' +
        math.leftExpandedNum +
        '/' +
        math.commonDen +
        '</strong> og <strong>' +
        math.rightExpandedNum +
        '/' +
        math.commonDen +
        '</strong>.</p>';
      els.mathStageContainer.innerHTML = '';
      els.mathStageContainer.appendChild(box);
    }
  }

  function renderNavBar(math) {
    els.btnPrev.disabled = state.step === 0;

    const ready = isStepReadyToAdvance(state.step, math);

    if (state.step < 5) {
      els.btnNext.disabled = !ready;
      if (state.step === 0) {
        els.btnNext.textContent = 'Start opptellingen →';
        els.navHint.textContent =
          state.initialGuess === null ? 'Du kan gjette først eller gå rett videre' : '';
      } else {
        els.btnNext.textContent = 'Neste steg →';
        if (!ready) {
          if (state.step === 1) {
            els.navHint.textContent =
              'Tell alle ' + math.fruitMeta.labelDefinitePlural + ' først';
          } else if (state.step === 2) {
            els.navHint.textContent = 'Tell alle 10 fruktene først';
          } else if (state.step === 3 || state.step === 4) {
            els.navHint.textContent = 'Velg riktig svar på gangestykket for å gå videre';
          }
        } else {
          els.navHint.textContent = 'Klar for neste steg!';
        }
      }
    } else {
      // Steg 5 (siste steg): tilby neste oppgave når denne er løst
      const hasNextTask = state.currentTaskIndex < TASKS.length - 1;
      if (ready && hasNextTask) {
        els.btnNext.disabled = false;
        els.btnNext.textContent = 'Prøv neste oppgave →';
        els.navHint.textContent = 'Bra jobba!';
      } else if (ready && !hasNextTask) {
        els.btnNext.disabled = false;
        els.btnNext.textContent = 'Tilbake til oppgave 1';
        els.navHint.textContent = 'Alle oppgavene er prøvd!';
      } else {
        els.btnNext.disabled = true;
        els.btnNext.textContent = 'Svar Sant eller Usant';
        els.navHint.textContent = 'Velg Sant eller Usant for å fullføre';
      }
    }
  }

  function renderAll() {
    const math = getActiveMath();
    renderHeaderAndTabs();
    renderStatementAndStepper(math);
    renderGuide(math);
    renderFruitSection(math);
    renderMathSection(math);
    renderNavBar(math);
  }

  function bindGlobalEvents() {
    els.btnPrev.addEventListener('click', function () {
      if (state.step > 0) {
        goToStep(state.step - 1);
      }
    });

    els.btnNext.addEventListener('click', function () {
      const math = getActiveMath();
      if (state.step < 5) {
        if (isStepReadyToAdvance(state.step, math)) {
          goToStep(state.step + 1);
        }
      } else if (isStepReadyToAdvance(5, math)) {
        const nextIndex =
          state.currentTaskIndex < TASKS.length - 1 ? state.currentTaskIndex + 1 : 0;
        resetTaskProgress(nextIndex);
        renderAll();
      }
    });

    els.btnReset.addEventListener('click', function () {
      resetTaskProgress(state.currentTaskIndex);
      renderAll();
    });

    els.btnReplayAnim.addEventListener('click', function () {
      if (
        window.BrokApp.FractionAnimator &&
        typeof window.BrokApp.FractionAnimator.replayAnimation === 'function'
      ) {
        window.BrokApp.FractionAnimator.replayAnimation();
      }
    });
  }

  function init() {
    cacheElements();
    bindGlobalEvents();
    renderAll();
  }

  window.BrokApp.state = state;
  window.BrokApp.goToStep = goToStep;
  window.BrokApp.resetTaskProgress = resetTaskProgress;
  window.BrokApp.renderAll = renderAll;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
