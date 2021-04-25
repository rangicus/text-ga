// Constants
const availableChars = `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz !@#$%^&*()-=_+\`~[]{}\\|;':",./<>?0123456789`.split(``);

// Classes
class DNA {
    constructor (n) {
        this.genes = [];
        this.fitness = null;

        for (let i = 0; i < n; i ++)
            this.genes[i] = randomChar();
    }

    toString () {
        return this.genes.join(``);
    }

    getFitness (target) {
        let score = 0;
        for (let i = 0; i < this.genes.length; i ++)
            if (this.genes[i] === target[i])
                score ++;

        this.fitness = score / target.length;

        return this.fitness;
    }

    crossover (other) {
        let child = new DNA(this.genes.length);

        let midpoint = Math.floor(Math.random() * this.genes.length);

        for (let i = 0; i < this.genes.length; i ++) {
            if (i < midpoint) child.genes[i] = this.genes[i];
            else child.genes[i] = other.genes[i];
        }

        return child;
    }

    mutate (rate) {
        for (let i = 0; i < this.genes.length; i ++)
            if (Math.random() < rate)
                this.genes[i] = randomChar();
    }
}

class Population {
    constructor (target, mutationRate, amt) {
        this.target = target;
        this.mutationRate = mutationRate;

        this.matingPool = [];
        this.generations = 0;
        this.perfectScore = 1;
        this.finished = false;
        this.best = ``;

        this.population = [];
        for (let i = 0; i < amt; i ++) {
            this.population[i] = new DNA(this.target.length);
        }

        this.getFitness();
    }

    // Runs the "getFitness" function on every child.
    getFitness () {
        let bestScore = -Infinity;
        let best = null;

        let totalFitness = 0;

        for (let i = 0; i < this.population.length; i ++) {
            let fit = this.population[i].getFitness(this.target);

            if (fit > bestScore) {
                bestScore = fit;
                best = this.population[i];
            }

            totalFitness += fit;
        }

        this.best = best.toString();
        this.bestFitness = bestScore;
        this.averageFitness = totalFitness / this.population.length;

        if (bestScore === this.perfectScore) this.finished = true;
    }

    // Fills the mating pool based on fitness. Requires "getFitness" to have been ran first.
    naturalSelection () {
        this.matingPool = [];

        let maxFitness = this.population
            .map(child => child.fitness)
            .reduce((pre, cur) => Math.max(pre, cur));
        
        for (let i = 0; i < this.population.length; i ++) {
            let relativeFitness = this.population[i].fitness / maxFitness;
            let amt = Math.floor(relativeFitness * 100);
            for (let j = 0; j < amt; j ++) this.matingPool.push(this.population[i]);
        }
    }

    // Uses the mating pool to breed a new generation.
    breed () {
        for (let i = 0; i < this.population.length; i ++) {
            let A = this.matingPool.random();
            let B = this.matingPool.random();
            let child = A.crossover(B);
            child.mutate(this.mutationRate);
            this.population[i] = child;
        }

        this.finished = false;
        this.generations ++;
    }
}

// Globals
let searchTerm = $(`#inputSearchText`).val(); // The term that the GA is trying to find.
let mutationRate = 0.01;
let populationSize = 1000;

let population = null;
let timeout = null;
let speed = 0;

// BP Functions
function setup () {
    clearTimeout(timeout);

    population = new Population(searchTerm, mutationRate, populationSize);
    population.getFitness();
}

function update () {
    population.naturalSelection();
    population.breed();
    population.getFitness();
}

function render () {
    // Render the best.
    const target = searchTerm.split(``);
    const result = population.best.split(``);
    const output = result.map((char, i) => {
        const correct = char === target[i];

        let span = $(`<span/>`, { text: char });

        if (!correct) span.addClass(`text-danger text-decoration-line-through`);

        return span;
    })

    $(`#textBestMember`).empty().append(output);

    // Render Data
    $(`#textGeneration`).text(population.generations);
    $(`#textBestFitness`).text((population.bestFitness * 100).toFixed(2) + `%`);
    $(`#textAverageFitness`).text(population.averageFitness.toPercent());
    $(`#textMutation`).text(mutationRate.toPercent());

    // Render All
    let amt = Math.min(population.population.length, 10);

    let table = $(`<table />`).append(
        $(`<thead />`).append(
            $(`<tr />`).append(
                $(`<th />`, { text: `Phrase` }),
                $(`<th />`, { text: `Fitness` }),
            )
        ),
    );

    let allBest = population.population
        .sort((a, b) => b.fitness - a.fitness)
        .slice(0, amt)
        .reduce((pre, cur) => pre.append(
            $(`<tr />`).append(
                $(`<td />`, { text: cur.toString() }),
                $(`<td />`, { text: (cur.fitness * 100).toFixed(2) + `%` }),
            )
        ), $(`<tbody />`, { class: `font-monospace` }));
    $(`#divAllMembers`).empty().append( table.append(allBest) );
}

function step () {
    update();
    render();

    if (!population.finished) timeout = setTimeout(step, speed);
}

function run () {
    setup();

    step();
}

// Functions
const randomChar = () => availableChars.random();

// Prototypes
Array.prototype.random = function () {
    return this[Math.floor(Math.random() * this.length)];
}

Number.prototype.toPercent = function () {
    return (this * 100).toFixed(2) + `%`;
}

// Bindings
$(`#inputSearchText`).on(`change, keyup`, function () {
    const val = $(this).val();

    if (val !== searchTerm && val.length > 0) {
        searchTerm = val;

        run();
    }
});

$(`#inputMutation`).on(`change, keyup`, function () {
    const val = Number($(this).val()) / 100;

    if (val !== mutationRate && val >= 0 && val <= 1) {
        mutationRate = val;

        run();
    }
});

$(`#inputPopulation`).on(`change, keyup`, function () {
    const min = 2;
    const max = 1000;
    
    const val = Math.floor(Number($(this).val()));

    if (val !== populationSize && val >= min && val <= max) {
        populationSize = val;
        $(this).val(val);
        run();
    } 
    else if (val < min) $(this).val(min);
    else if (val > max) $(this).val(max);
});

$(`#buttonRestart`).click(function () {
    run();
});

// Main
run();