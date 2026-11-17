(function () {
  'use strict';

  window.BrokApp = window.BrokApp || {};

  const FRUIT_META = {
    banana: {
      type: 'banana',
      emoji: '🍌',
      labelSingular: 'banan',
      labelPlural: 'bananer',
      labelDefinitePlural: 'bananene',
      color: '#FACC15',
      strokeColor: '#CA8A04'
    },
    apple: {
      type: 'apple',
      emoji: '🍎',
      labelSingular: 'eple',
      labelPlural: 'epler',
      labelDefinitePlural: 'eplene',
      color: '#EF4444',
      strokeColor: '#B91C1C'
    },
    orange: {
      type: 'orange',
      emoji: '🍊',
      labelSingular: 'appelsin',
      labelPlural: 'appelsiner',
      labelDefinitePlural: 'appelsinene',
      color: '#FB923C',
      strokeColor: '#C2410C'
    },
    pear: {
      type: 'pear',
      emoji: '🍐',
      labelSingular: 'pære',
      labelPlural: 'pærer',
      labelDefinitePlural: 'pærene',
      color: '#84CC16',
      strokeColor: '#4D7C0F'
    }
  };

  // Fruktfatet inneholder 3 bananer, 2 epler, 4 appelsiner og 1 pære = 10 frukter
  const FRUITS = [
    {
      id: 'banana-1',
      type: 'banana',
      labelSingular: FRUIT_META.banana.labelSingular,
      labelPlural: FRUIT_META.banana.labelPlural,
      color: FRUIT_META.banana.color,
      x: 132,
      y: 122,
      rotation: -18
    },
    {
      id: 'orange-1',
      type: 'orange',
      labelSingular: FRUIT_META.orange.labelSingular,
      labelPlural: FRUIT_META.orange.labelPlural,
      color: FRUIT_META.orange.color,
      x: 205,
      y: 108,
      rotation: 0
    },
    {
      id: 'apple-1',
      type: 'apple',
      labelSingular: FRUIT_META.apple.labelSingular,
      labelPlural: FRUIT_META.apple.labelPlural,
      color: FRUIT_META.apple.color,
      x: 278,
      y: 112,
      rotation: 8
    },
    {
      id: 'banana-2',
      type: 'banana',
      labelSingular: FRUIT_META.banana.labelSingular,
      labelPlural: FRUIT_META.banana.labelPlural,
      color: FRUIT_META.banana.color,
      x: 348,
      y: 128,
      rotation: 16
    },
    {
      id: 'orange-2',
      type: 'orange',
      labelSingular: FRUIT_META.orange.labelSingular,
      labelPlural: FRUIT_META.orange.labelPlural,
      color: FRUIT_META.orange.color,
      x: 102,
      y: 178,
      rotation: 0
    },
    {
      id: 'pear-1',
      type: 'pear',
      labelSingular: FRUIT_META.pear.labelSingular,
      labelPlural: FRUIT_META.pear.labelPlural,
      color: FRUIT_META.pear.color,
      x: 175,
      y: 172,
      rotation: -8
    },
    {
      id: 'orange-3',
      type: 'orange',
      labelSingular: FRUIT_META.orange.labelSingular,
      labelPlural: FRUIT_META.orange.labelPlural,
      color: FRUIT_META.orange.color,
      x: 245,
      y: 170,
      rotation: 0
    },
    {
      id: 'apple-2',
      type: 'apple',
      labelSingular: FRUIT_META.apple.labelSingular,
      labelPlural: FRUIT_META.apple.labelPlural,
      color: FRUIT_META.apple.color,
      x: 315,
      y: 175,
      rotation: -6
    },
    {
      id: 'orange-4',
      type: 'orange',
      labelSingular: FRUIT_META.orange.labelSingular,
      labelPlural: FRUIT_META.orange.labelPlural,
      color: FRUIT_META.orange.color,
      x: 382,
      y: 180,
      rotation: 0
    },
    {
      id: 'banana-3',
      type: 'banana',
      labelSingular: FRUIT_META.banana.labelSingular,
      labelPlural: FRUIT_META.banana.labelPlural,
      color: FRUIT_META.banana.color,
      x: 242,
      y: 215,
      rotation: 4
    }
  ];

  /**
   * 4 oppgaver knyttet til det samme fruktfatet
   */
  const TASKS = [
    {
      id: 'bananas-one-third',
      title: '1. Bananer',
      emoji: '🍌',
      isMain: true,
      targetFruit: 'banana',
      operator: 'more',
      compareFraction: { num: 1, den: 3 },
      statement: 'Mer enn 1/3 av fruktene på fatet er bananer.'
    },
    {
      id: 'oranges-one-third',
      title: '2. Appelsiner',
      emoji: '🍊',
      isMain: false,
      targetFruit: 'orange',
      operator: 'more',
      compareFraction: { num: 1, den: 3 },
      statement: 'Mer enn 1/3 av fruktene på fatet er appelsiner.'
    },
    {
      id: 'apples-one-fourth',
      title: '3. Epler',
      emoji: '🍎',
      isMain: false,
      targetFruit: 'apple',
      operator: 'less',
      compareFraction: { num: 1, den: 4 },
      statement: 'Mindre enn 1/4 av fruktene på fatet er epler.'
    },
    {
      id: 'pears-one-eighth',
      title: '4. Pærer',
      emoji: '🍐',
      isMain: false,
      targetFruit: 'pear',
      operator: 'more',
      compareFraction: { num: 1, den: 8 },
      statement: 'Mer enn 1/8 av fruktene på fatet er pærer.'
    }
  ];

  /**
   * Regner ut alle brøkverdier, utvidelsesfaktorer og fasitsvar for en oppgave.
   */
  function deriveTaskMath(task, fruits) {
    const fruitList = fruits || FRUITS;
    const meta = FRUIT_META[task.targetFruit];
    const targetFruits = fruitList.filter(function (f) {
      return f.type === task.targetFruit;
    });

    const leftNum = targetFruits.length;
    const leftDen = fruitList.length;
    const rightNum = task.compareFraction.num;
    const rightDen = task.compareFraction.den;

    // Vi ganger teller og nevner i hver brøk med nevneren fra den andre brøken
    const leftFactor = rightDen;
    const rightFactor = leftDen;
    const commonDen = leftDen * rightDen;

    const leftExpandedNum = leftNum * leftFactor;
    const rightExpandedNum = rightNum * rightFactor;

    let comparisonSymbol = '=';
    if (leftExpandedNum > rightExpandedNum) {
      comparisonSymbol = '>';
    } else if (leftExpandedNum < rightExpandedNum) {
      comparisonSymbol = '<';
    }

    const isTrue =
      task.operator === 'more'
        ? leftExpandedNum > rightExpandedNum
        : leftExpandedNum < rightExpandedNum;

    const operatorText = task.operator === 'more' ? 'Mer enn' : 'Mindre enn';
    const operatorLower = task.operator === 'more' ? 'mer enn' : 'mindre enn';

    return {
      task: task,
      fruitMeta: meta,
      targetFruitIds: targetFruits.map(function (f) {
        return f.id;
      }),
      leftNum: leftNum,
      leftDen: leftDen,
      rightNum: rightNum,
      rightDen: rightDen,
      leftFactor: leftFactor,
      rightFactor: rightFactor,
      commonDen: commonDen,
      leftExpandedNum: leftExpandedNum,
      rightExpandedNum: rightExpandedNum,
      comparisonSymbol: comparisonSymbol,
      isTrue: isTrue,
      operatorText: operatorText,
      operatorLower: operatorLower
    };
  }

  window.BrokApp.FRUIT_META = FRUIT_META;
  window.BrokApp.FRUITS = FRUITS;
  window.BrokApp.TASKS = TASKS;
  window.BrokApp.deriveTaskMath = deriveTaskMath;
})();
