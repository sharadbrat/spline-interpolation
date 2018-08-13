function mathModule(equationSourceId) {
  
  const source = document.getElementById(equationSourceId);
  let fromXSource;
  let toXSource;
  let stepSource;

  let A = [];
  let B = [];
  let C = [];
  let D = [];

  const module = {}

  let fromX = -10;
  let toX = 10;
  let step = 20;

  let maxDifference = 0;

  //  PRIVATE SECTION

  function mapRes(res) {
    return res.map(el => {
      el.fn = simplifyFn(el.fn);
      return el;
    });
  }

  function simplifyFn(fn) {
    let copy = `${fn}`;

    copy = copy.replace(/- -/g, '+ ');
    copy = copy.replace(/- \+/g, '- ');
    copy = copy.replace(/\+ -/g, '- ');
    copy = copy.replace(/\+ \+/g, '+ ');
    copy = copy.replace(/(\+|-)\s*0\s*\*\s*\(.*\)\s*\^\s*\d/g, '');

    return copy
  }

  function getPoints() {
    const res = [];
    for (let i = 0; i <= step; i++) {
      res.push(fromX + i * ((toX - fromX) / step))
    }
    return res;
  }

  function getValues() {
    const res = [];
    const points = getPoints();
    for (let i = 0; i < points.length; i++) {
      res.push(math.eval(module.getEquation().replace(/x/g, points[i])))
    }
    return res;
  }

  function calculateMaxDifference(splines) {
    const points = getPoints();
    for (let i = 0; i < splines.length; i++) {
      const functionValue = math.eval(module.getEquation().replace(/x/g, (points[i] + points[i + 1]) / 2));
      const splineValue = math.eval(splines[i].replace(/x/g, (points[i] + points[i + 1]) / 2));

      const difference = Math.abs(functionValue - splineValue);

      maxDifference = difference > maxDifference ? difference : maxDifference;
    }
  }

  function getTruncatedCoeff(coeff) {
    return coeff.toFixed(2);
  }

  function getTruncatedCoeffsArray(coeffs) {
    return coeffs.map(c => getTruncatedCoeff(c));
  }

  //  PUBLIC SECTION

  module.getCoeffs = () => {
    return {A, B, C, D};
  };

  module.getTruncatedCoeffs = () => {
    return {
      A: getTruncatedCoeffsArray(A),
      B: getTruncatedCoeffsArray(B),
      C: getTruncatedCoeffsArray(C),
      D: getTruncatedCoeffsArray(D)
    }
  };

  module.init = (_fromXSource, _toXSource, _stepSource) => {
    fromXSource = document.getElementById(_fromXSource);
    toXSource = document.getElementById(_toXSource);
    stepSource = document.getElementById(_stepSource);
    module.updateBounds();
  };

  module.updateBounds = () => {
    fromX = +fromXSource.value;
    toX = +toXSource.value;
    step = +stepSource.value;
  };

  module.getMaxDifference = () => {
    const tmp = maxDifference;
    maxDifference = 0;
    return getTruncatedCoeff(tmp);
  };

  module.resize = (res) => res.programmaticZoom([fromX - 1, toX + 1], [math.min(getValues()) - 1, math.max(getValues()) + 1]);

  module.getEquation = () => source.value;
  
  module.cubicSpline = () => {
    const n = getPoints().length;
    const xn = getPoints();
    const a = getValues();

    const h = Array(n - 1).fill(0);
    const alpha = Array(n - 1).fill(0);

    // l, u, z are used in the method for solving the linear system
    const l = Array(n + 1).fill(0);
    const u = Array(n).fill(0);
    const z = Array(n + 1).fill(0);

    // b, c, d will be the coefficients along with a.
    const b = Array(n).fill(0);
    const c = Array(n + 1).fill(0);
    const d = Array(n).fill(0);

    for (let i = 0; i < n - 1; i++)
      h[i] = xn[i + 1] - xn[i];

    for (let i = 1; i < n - 1; i++)
      alpha[i] = (3 / h[i]) * (a[i + 1] - a[i]) - (3 / h[i - 1]) * (a[i] - a[i - 1]);

    l[0] = 1;
    u[0] = 0;
    z[0] = 0;

    for (let i = 1; i < n - 1; i++) {
      l[i] = 2 * (xn[i + 1] - xn[i - 1]) - h[i - 1] * u[i - 1];
      u[i] = h[i] / l[i];
      z[i] = (alpha[i] - h[i - 1] * z[i - 1]) / l[i];
    }   

    l[n] = 1;
    z[n] = 0;
    c[n] = 0;

    for (let i = n - 2; i > -1; i--) {
      c[i] = z[i] - u[i] * c[i + 1];
      b[i] = (a[i + 1] - a[i]) / h[i] - h[i] * (c[i + 1] + 2 * c[i]) / 3;
      d[i] = (c[i + 1] - c[i]) / (3 * h[i]);
    }

    const res = [];

    for (let i = 0; i < n - 1; i++) {
      res.push(`${d[i]} * (x - ${xn[i]}) ^ 3 + ${c[i]} * (x - ${xn[i]}) ^ 2 + ${b[i]} * (x - ${xn[i]}) + ${a[i]}`);
    }

    A = a;
    B = b;
    C = c;
    D = d;

    return res;
  };

  module.getInterpolatedEquations = () => {
    const res = [];
    const splines = module.cubicSpline();
    const xn = getPoints();
    calculateMaxDifference(splines);
    for (let i = 0; i < splines.length; i++) {
      res.push({
        fn: splines[i],
        sampler: 'builtIn',
        graphType: 'polyline',
        range: [xn[i], xn[i + 1]],
        color: '#f00' 
      });
    }
    return mapRes(res);
  };
  
  module.drawInitial = (targetInitial) => {
    const res = functionPlot({
      target: targetInitial,
      data: [{
        fn: module.getEquation(),
        sampler: 'builtIn',
        graphType: 'polyline',
        range: [fromX, toX],
        color: '#00f'
      }]
    });
  };

  module.drawInterpolated = (targetInterpolated) => {
    const data = {
      target: targetInterpolated,
      data: module.getInterpolatedEquations()
    };

    const res = functionPlot(data);

  };

  module.drawTogether = (targetTogether) => {
    const data = module.getInterpolatedEquations();
    data.push({
      fn: module.getEquation(),
      sampler: 'builtIn',
      graphType: 'polyline',
      range: [fromX, toX],
      color: '#00f'
    });
    const res = functionPlot({
      target: targetTogether,
      data: data
    });
  };

  return module;

}

const facade = mathModule('source');

facade.init('from', 'to', 'step');

function drawDifference(selector) {
  document.querySelector(selector).innerHTML = `<span>${facade.getMaxDifference()}</span>`
}

function drawSplines(selector) {
  const renderElem = document.querySelector(selector);
  const coeffs = facade.getTruncatedCoeffs();
  let res = '';
  for (let i = 0; i < coeffs.A.length; i++)
    res += `<tr>
              <td>${i}</td>
              <td>${coeffs.A[i]}</td>
              <td>${coeffs.B[i]}</td>
              <td>${coeffs.C[i]}</td>
              <td>${coeffs.D[i]}</td>
            </tr>`
  renderElem.innerHTML = res;
}

function draw() {
  document.getElementById('initial').innerHTML = '';
  document.getElementById('interpolated').innerHTML = '';
  document.getElementById('together').innerHTML = '';
  facade.drawInitial('#initial');
  facade.drawInterpolated('#interpolated');
  facade.drawTogether('#together');
  drawDifference('#difference');
  drawSplines('#splines');
}

document.getElementById('form').onsubmit = (event) => {
  event.preventDefault();
  facade.updateBounds();
  draw();
};

draw();