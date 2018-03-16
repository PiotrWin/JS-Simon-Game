 /*jshint -W056*/  /*jshint -W083*/

// TODO
// - play->click->disabled
// - reset->click-> play enabled
// - game over -> play enabled

"use strict";

$(document).ready(() => {

let audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let [gainNodes, gainNodeWrong] = audioSetup();
let timeout = 500;
let timeoutMisc = 1000;

let game = {
    started: false,
    strict: true,
    active: false,
    sequence: [],
    pressed: [],
    pushCount: 0,

    init: function init() {
        this.started = true;
        this.sequence.push(random(0, 3));
        $('#counter').text(this.sequence.length);
        if (this.strict)
            $('#strict-ticker').addClass('activated');
        else
            $('#strict-ticker').removeClass('activated');
    },
    /* jshint ignore:start */
    play: async function play() {
        if (!this.started)
            this.init();
        this.active = false;
        this.pressed = [];
        this.pushCount = 0;
        if(this.sequence.length <= 5)
            timeout = 750;
        else if (this.sequence.length <= 10)
            timeout = 600;
        else if (this.sequence.length <= 20)
            timeout = 500;
        let chain = await this.playSequence(this.sequence);
        this.active = true;
    },
    /* jshint ignore:end */
    playSequence: function playSequence(seq) {
        let chain = new Promise(resolve => {
            setTimeout(() => {
                $(`#btn-${seq[0]}`).addClass(`b${seq[0]}`);
                playTone(gainNodes[seq[0]]);
                setTimeout(() => {
                    $(`#btn-${seq[0]}`).removeClass(`b${seq[0]}`);
                    stopTone(gainNodes[seq[0]]);
                    resolve();
                }, timeout);
            }, timeout);

        });
        for (let i = 1; i < seq.length; i++) {
            chain = chain.then(() => {
                return new Promise(resolve => {
                    setTimeout(() => {
                        $(`#btn-${seq[i]}`).addClass(`b${seq[i]}`);
                        playTone(gainNodes[seq[i]]);
                        setTimeout(() => {
                            $(`#btn-${seq[i]}`).removeClass(`b${seq[i]}`);
                            stopTone(gainNodes[seq[i]]);
                            resolve();
                        }, timeout);
                    }, timeout/3);
                });
            });
        }
        return chain;
    },
    reset: function reset() {
        this.started = false;
        this.active = false;
        this.sequence = [];
        this.pressed = [];
        $('#counter').text('--');
    },
    restart: function restart() {
        this.started = true;
        this.sequence = [];
        this.sequence.push(random(0, 3));
        this.pressed = [];
        $('#counter').text(this.sequence.length);
    },
    pushButton: function pushButton(n) {
        if (this.pressed.length < this.sequence.length)
            this.pressed.push(n);
        let subSeq = this.sequence.slice(0, this.pressed.length);
        if (subSeq.every((v, i) => {
            return v == this.pressed[i];
        })) { // if arrays are equal
            this.pushCount++;
            if (this.pushCount == this.sequence.length) {
                this.active = false;
                setTimeout(() => {
                    this.sequence.push(random(0, 3));
                    $('#counter').text(this.sequence.length);
                    if (this.pushCount == 1) {
                        $('#gameover').css({'visibility': 'visible'}).hide().fadeIn(750);
                        $('#counter').text('--');
                        setTimeout(() => {
                            this.reset();
                            $('#gameover').fadeOut(750, () => {
                                $('#gameover').css({'visibility': 'hidden'}).show();
                                $('#play').attr('disabled', false);
                                this.reset();
                            });
                        }, timeoutMisc*3);
                    }
                    else this.play();
                }, timeoutMisc);
            }
        }
        else { // restart step
            this.active = false;
            $('#counter').text('!!');
            playTone(gainNodeWrong);
            setTimeout(() => {
                $('#counter').text(this.sequence.length);
                stopTone(gainNodeWrong);
                if (this.strict)
                    this.restart();
                this.play();
            }, 1000);
        }
    },
    // getters
    isActive: function isActive() {
        return this.active;
    },
    isStarted: function isStarted() {
        return this.started;
    },
    isStrict: function isStrict() {
        return this.strict;
    },
    // setters
    setStrict: function setStrict(s) {
        this.strict = !!s;
    }
};

// button events
$('#play').click(() => {
    if (!game.isStarted()) {
        game.play();
        $('#play').attr('disabled', true);
    }
});
$('#strict').click(() => {
    if (game.isStrict()) {
        game.setStrict(false);
        $('#strict-ticker').removeClass('activated');
    }
    else {
        game.setStrict(true);
        $('#strict-ticker').addClass('activated');
    }
});
$('#reset').click(() => {
    if (game.isActive()) {
        game.reset();
        $('#play').attr('disabled', false);
    }
});
$('.buttons .btn').click(event => {
    if (game.isActive()) {
        let val = $(event.target).attr('value');
        game.pushButton(val);
    }
});
$('.buttons .btn').mousedown(event => {
    if (game.isActive()) {
        let id = $(event.target).attr('value');
        $(`#btn-${id}`).addClass(`b${id}`);
        playTone(gainNodes[id]);
    }
});
$('.buttons .btn').on('mouseup mouseleave', event => {
    if (game.isActive()) {
        let id = $(event.target).attr('value');
        $(`#btn-${id}`).removeClass(`b${id}`);
        stopTone(gainNodes[id]);
    }
});

$('#counter').text('--');
if (game.isStrict())
    $('#strict-ticker').addClass('activated');
else
    $('#strict-ticker').removeClass('activated');

// other functions
function audioSetup() {
    let freqs = [329.63, 261.63, 220, 164.81];

    // create sound for pushing wrong button
    let wrongOsc = audioCtx.createOscillator();
    wrongOsc.type = 'triangle';
    wrongOsc.frequency.setValueAtTime(110, audioCtx.currentTime);
    wrongOsc.start(0.0);
    let wrongGain = audioCtx.createGain();
    wrongOsc.connect(wrongGain);
    wrongGain.gain.setValueAtTime(0, audioCtx.currentTime);
    wrongGain.connect(audioCtx.destination);

    // create other sounds
    let oscillators = freqs.map((freq) => {
        let osc = audioCtx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        osc.start(0.0);
        return osc;
    });
    let gainNodes = oscillators.map((osc) => {
        let gainNode = audioCtx.createGain();
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        return gainNode;
    });
    return [gainNodes, wrongGain];
}
function playTone(node) {
    node.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.01);
}
function stopTone(node) {
    node.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.01);
}
function random(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}
});
