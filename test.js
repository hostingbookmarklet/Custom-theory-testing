let haxEnabled = false;
let turns = 0;
let time = 0;
let c = 0n;
let cBigNum = BigNumber.from(c);
let cSum = cBigNum;
let cLog = cSum.max(BigNumber.ONE).log10().toNumber();
let totalEclog = 0;
let totalIncLevel = 0;
let history = {};
let lastHistory;
let lastHistoryStrings = [[], []];
let writeHistory = true;
let historyNumMode = 0;
let historyIdxMode = 1;
let mimickLastHistory = false;
let nextNudge = 0;
let preserveLastHistory = false;
let marathonBadge = false;

let bigNumArray = (array) => array.map(x => BigNumber.from(x));

// All balance parameters are aggregated for ease of access

const borrowFactor = 1;
const borrowCap = 9232;
const q1Cost = new FirstFreeCost(new ExponentialCost(1000, 1.5));
const getq1BonusLevels = (bl) => bl ? Math.min((totalEclog + cLog) *
borrowFactor, borrowCap) : 0;
const getq1 = (level) => Utils.getStepwisePowerSum(level + Math.floor(
getq1BonusLevels(q1BorrowMs.level)), 2, 10, 0);

const q1ExpInc = 0.03;
const q1ExpMaxLevel = 4;
const getq1Exponent = (level) => 1 + q1ExpInc * level;

const q2Cost = new ExponentialCost(2.2e7, 6);
const getq2 = (level) => BigNumber.TWO.pow(level);

const q3Cost = new ExponentialCost(BigNumber.from('1e301'), Math.log2(1e3));
const getq3 = (level) => BigNumber.THREE.pow(level) + (marathonBadge ? 1 : 0);

const extraIncCost = new ExponentialCost(1e40, Math.log2(5));
const getr = (level) => Utils.getStepwisePowerSum(level, 2, 6, 0);
const getrPenalty = (level) => BigNumber.FOUR.pow(getr(level));

const permaCosts = bigNumArray(['1e12', '1e20', '1e24', '1e36', '1e1200',
'1e60']);

const milestoneCost = new CustomCost((level) =>
{
    if(level == 0) return BigNumber.from(30 * tauRate);
    if(level == 1) return BigNumber.from(45 * tauRate);
    if(level == 2) return BigNumber.from(75 * tauRate);
    if(level == 3) return BigNumber.from(105 * tauRate);
    if(level == 4) return BigNumber.from(150 * tauRate);
    if(level == 5) return BigNumber.from(210 * tauRate);
    if(level == 6) return BigNumber.from(270 * tauRate);
    if(level == 7) return BigNumber.from(330 * tauRate);
    if(level == 8) return BigNumber.from(390 * tauRate);
    if(level == 9) return BigNumber.from(450 * tauRate);
    return BigNumber.from(-1);
});
const oldMilestoneCost = new CompositeCost(2, new LinearCost(6, 6),
new CompositeCost(9, new LinearCost(24, 12), new LinearCost(120, 12)));

const cLevelCap = [14, 22, 30, 38, 50];
const cooldown = [36, 32, 28, 24, 18];

const tauRate = 0.15;
const pubExp = 3.07;
// const pubMult = 8;
var getPublicationMultiplier = (tau) => tau.pow(pubExp);
var getPublicationMultiplierFormula = (symbol) =>
`{${symbol}}^{${pubExp}}`;

var freeze;
var nudge, q1, q2, q3, extraInc;
var freezePerma, extraIncPerma, mimickPerma;
var freeEclog;
var cooldownMs, q1BorrowMs, q1ExpMs, q3UnlockMs;

var currency, EcCurrency;

var finalChapter;

const locStrings =
{
    en:
    {
        versionName: 'v0.10h1',
        longTick: 'Tick: {0}s',

        history: 'History',
        historyDesc: `\\begin{{array}}{{c}}\\text{{History}}\\\\{{{0}}}/{{{1}}}
        \\end{{array}}`,
        historyInfo: `Shows the last and current publications' sequences`,
        freezeDesc: ['Freeze {0} timer', 'Unfreeze {0} timer'],
        freezeInfo:
        [
            'Freezes the turn timer in place',
            'Resumes the turn timer'
        ],

        permaFreeze: 'c \\text{{ timer freezing}}',
        permaIncrement: `\\text{{extra in/decrements for }}c`,
        permaIncrementInfo: `Dependent on {0}'s sign; incurs penalty ` +
`on overall income`,
        permaMimick: 'Auto-nudge {0}',
        permaMimickInfo: 'Mimicks your last sequence',

        q1Level: 'q_1\\text{{ level}}',
        cLevel: '1/{{{0}}}\\text{{{{ of }}}}c\\text{{{{ level}}}}',
        cLevelth: `1/{{{0}}}^\\text{{{{th}}}}\\text{{{{ of }}}}c
        \\text{{{{ level}}}}`,
        Eclog: `\\log_{{10}}\\Pi(\\Sigma c)\\text{{ across publications}}`,
        EclogInfo: 'Preserved after publications (max {0})',
        cLevelCap: 'c\\text{{ level cap}}',
        cooldown: '\\text{{interval}}',
        cooldownInfo: 'Interval',
        nTicks: '{{{0}}}\\text{{{{ ticks}}}}',
        condition: `\\text{{if }}{{{0}}}`,

        alternating: ' (alternating)',
        penalty: '{0} level penalty = ',
        deductFromc: '\\text{{ (- }} {{{0}}} \\text{{ levels from }}c)',
        auto: ['', 'Auto'],

        ch1Title: 'Preface',
        ch1Text: `You are a talented undergraduate student.
Your professors see a bright future ahead of you.
One professor you respect hands you a formula,
then asks you if it converges into a finite cycle.
It is a modular recursive equation.
Not knowing how to solve it, you start to
nudge the value behind their backs.`,

        ch2Title: 'Nudge Theory',
        ch2Text: `In your graduation thesis, you have documented
sequences that seemingly go from 0 to
breaking the integer limits.
It's certainly interesting: even though it's
bound to fall, if you cheat by even just a little bit,
the outcome can get a lot better.

Occasionally, you can be heard in the lab,
giggling with some of your online chat friends,
who call you: the CEO of Nudge.`,

        ch3Title: 'Escalations',
        ch3Text: `Eventually, a colleague of yours has come to
know about your nudging business...

'I've always had these nightmares about climbing.
Weaving through the cityscapes, but
the purpose had never been for recreation...
It was always some kind of accident.
Then suddenly, I was caught under the
scrying eyes of a headmaster, and
I had to keep scaling and scaling,
I wanted it to stop, I wished I could jump
into one of those windows, and
beg the family inside to let me stay!'`,

        ch3bTitle: '...Escalations',
        ch3bText:`'...But I got caught again, and my punishments
escalated. Then there were the constant chases,
fruitless beggings, and then I was caught again.
My punishments escalated.
But I don't want to be a criminal...'

You wake yourself up, looking frozen all over.
A shiver shakes you up, and suddenly, you
chance upon that colleague in the hallway.
She is the only one who knows this.`,

        ch4Title: 'Auto-Nudge',
        ch4Text: `'Honestly, what really is this?'

You have been using the gifted Auto-Nudge machine
for a while now. It's fairly reliable.
It's got a mechanical hand, programmable rhythms,
a foot-cranked toggle, histograph displays...

You begin to wonder: Who in the world would've
gift you this machine in the first place,
tailored to every nook of your nature.
Urging you to multiply your operations
and get you busted.

You see two signatures on the
back of the machine.
The thought sickens you.`,

        ch5Title: 'I Hate You',
        ch5Text: `You had a dream last night.
The lab was covered with stacks of paper.
8, 9 stacks here, 28 boxes there, 27, 82, 41,...
You scrambled all of it up. Where did you leave
the Auto-Nudge?

Your supervisor came into the lab.
'I have already told you since last week
that you have to clean this mess up.
Do it before tomorrow.
And by the way, your friend came to visit.'

You turned your face towards him.
Your knuckle instinctively covered your
bloating mouth like a blowgun, your eyes
like taking aim.
'I hate you, you made me do this!',
you mumbled, before running out of breath
and walking away from the lab.`,

        ch6Title: 'Deadline Approaches',
        ch6Text: `'I did not make you do this.
When I showed you the conjecture, you were the one
who went in with eyes determined, sleeves ready
to roll. Then, I found out that you were merely
pretending to solve what you couldn't.
I don't see how dodging away from the problem
would fulfill what I am asking of you:
simple really. Just the best your honesty can do.'

The deadline is next month. Finish it.`,

        ch7Title: 'Plateau',
        ch7Text: `{0} pages of modular arithmetic.
In your graduation thesis, you have documented
sequences that seemingly go from 0 to
breaking the integer limits.

You have graduated.
Although, nowhere closer to solving the Collatz
conjecture, for both you and your supervisor.
Can you put blame on yourself, when he
was the one who tasked a single student
to do all the hard work?
Can you put blame on him, when neither of
you really communicated with each other
from the start?

You decide to spend a day out with yourself.
Lying on a hill, you notice the clouds looking
as if they're jumping up by three plus one.
And then you close your eyes, and envision
yourself just rolling off gently through
the grass...
until you hit a bush.

Note: q1 levels have stopped stacking.`,

        achNegativeTitle: 'Shrouded by Fog',
        achNegativeDesc: `Publish with an odd level of c and go negative.`,
        achMarathonTitle: 'Local Marathon',
        achMarathonDesc: 'Reach a c value of ±1e48 without using extra ' +
        'levels. Reward: +1 to q3.',
        achSixNineTitle: 'I\'m proud of you.',
        achSixNineDesc: 'Reach a c value of 69.',

        btnClose: 'Close',
        btnSave: 'Save',
        btnIndexingMode: ['Indexing: Turns', 'Indexing: Levels'],
        btnNotationMode: ['Notation: Digits', 'Notation: Scientific'],
        btnBaseMode: ['Change base: 10', 'Change base: 2'],
        permaBaseInfo: 'Changes the display of {0} on the equation',

        menuHistory: 'Sequence History',
        labelCurrentRun: 'Current sequence:',
        labelLastRun: 'Last sequence:',
        labelMimick: 'Auto-nudge {0} (follows last pub): ',
        labelPreserve: 'Lock last sequence: ',
        errorInvalidNumMode: 'Invalid number mode',
        errorBinExpLimit: 'Too big',

        reset: `You are about to restart the publication.
Σc and nudge polarity will be preserved.`
    }
};

const menuLang = Localization.language;
/**
 * Returns a localised string.
 * @param {string} name the internal name of the string.
 * @returns {string} the string.
 */
let getLoc = (name, lang = menuLang) =>
{
    if(lang in locStrings && name in locStrings[lang])
        return locStrings[lang][name];

    if(name in locStrings.en)
        return locStrings.en[name];
    
    return `String missing: ${lang}.${name}`;
}

const cDispColour = new Map();
cDispColour.set(Theme.STANDARD, 'c0c0c0');
cDispColour.set(Theme.DARK, 'b5b5b5');
cDispColour.set(Theme.LIGHT, '434343');

const cIterProgBar = ui.createProgressBar
({
    margin: new Thickness(6, 0),
    progressColor: () => !mimickLastHistory || (nudge &&
    nudge.level == nudge.maxLevel) || (nextNudge in lastHistory &&
    turns == lastHistory[nextNudge][0] - 1) ? Color.TEXT : Color.BORDER
});
/* Image size reference
Size 20:
270x480

Size 24:
360x640
450x800
540x960

Size 36:
720x1280

Size 48:
1080x1920
*/
let getImageSize = (width) =>
{
    if(width >= 1080)
        return 48;
    if(width >= 720)
        return 36;
    if(width >= 360)
        return 24;

    return 20;
}

let getBtnSize = (width) =>
{
    if(width >= 1080)
        return 96;
    if(width >= 720)
        return 72;
    if(width >= 360)
        return 48;

    return 40;
}

let getMediumBtnSize = (width) =>
{
    if(width >= 1080)
        return 88;
    if(width >= 720)
        return 66;
    if(width >= 360)
        return 44;

    return 36;
}

let getSmallBtnSize = (width) =>
{
    if(width >= 1080)
        return 80;
    if(width >= 720)
        return 60;
    if(width >= 360)
        return 40;

    return 32;
}

const historyFrame = ui.createFrame
({
    isVisible: false,
    row: 0,
    column: 2,
    cornerRadius: 1,
    horizontalOptions: LayoutOptions.END,
    verticalOptions: LayoutOptions.START,
    margin: new Thickness(9),
    padding: new Thickness(1, 1, 1, 2),
    hasShadow: true,
    heightRequest: getImageSize(ui.screenWidth),
    widthRequest: getImageSize(ui.screenWidth),
    content: ui.createImage
    ({
        // margin: new Thickness(2),
        source: ImageSource.BOOK,
        aspect: Aspect.ASPECT_FIT,
        useTint: false
    }),
    onTouched: (e) =>
    {
        if(e.type == TouchType.SHORTPRESS_RELEASED ||
        e.type == TouchType.LONGPRESS_RELEASED)
        {
            Sound.playClick();
            let menu = createHistoryMenu();
            menu.show();
        }
    }
});
const historyLabel = ui.createLatexLabel
({
    isVisible: false,
    row: 0,
    column: 2,
    horizontalOptions: LayoutOptions.END,
    verticalTextAlignment: TextAlignment.START,
    margin: new Thickness(0, 40, 2.5, 0),
    text: getLoc('history'),
    fontSize: 9,
    textColor: () => Color.fromHex(cDispColour.get(game.settings.theme))
});
const mimickFrame = ui.createFrame
({
    isVisible: false,
    row: 0,
    column: 2,
    cornerRadius: 1,
    horizontalOptions: LayoutOptions.END,
    verticalOptions: LayoutOptions.END,
    margin: new Thickness(9),
    padding: new Thickness(1, 1, 1, 2),
    hasShadow: true,
    heightRequest: getImageSize(ui.screenWidth),
    widthRequest: getImageSize(ui.screenWidth),
    content: ui.createImage
    ({
        source: () => mimickLastHistory && nudge &&
        nudge.level < nudge.maxLevel ? ImageSource.STAR_FULL :
        ImageSource.STAR_EMPTY,
        aspect: Aspect.ASPECT_FIT,
        useTint: false
    }),
    onTouched: (e) =>
    {
        if(e.type == TouchType.SHORTPRESS_RELEASED ||
        e.type == TouchType.LONGPRESS_RELEASED)
        {
            Sound.playClick();
            mimickLastHistory = !mimickLastHistory;
            if(mimickLastHistory)
            nextNudge = binarySearch(Object.keys(lastHistory), turns);
        }
    }
});
const mimickLabel = ui.createLatexLabel
({
    isVisible: false,
    row: 0,
    column: 2,
    horizontalOptions: LayoutOptions.END,
    verticalOptions: LayoutOptions.END,
    verticalTextAlignment: TextAlignment.START,
    margin: new Thickness(0, 0, 8, 44),
    text: () => (getLoc('auto')[Number(mimickLastHistory)]),
    fontSize: 9,
    textColor: () => Color.fromHex(cDispColour.get(game.settings.theme))
});

let getShortString = (n) =>
{
    let s = n.toString();
    if(s.length > 9)
        s = `${s.slice(0, 4)}...${s.slice(-4)}`;
    return s;
}

let getShortBinaryString = (n) =>
{
    let s = BigInt(n).toString(2);
    if(s.length > 9)
        s = `${s.slice(0, 3)}...${s.slice(-5)}`;
    return s;
}

let getSciBinString = (n) =>
{
    let offset = 1;
    let s = BigInt(n).toString(2);
    if(s[0] == '-')
        offset = 2;

    if(s.length < 8)
        return s;

    let exponent = s.length - offset;
    // Negative
    if(s[0] == '-')
    {
        if(exponent >= 1000000)
        {
            let expofExp = Math.log10(exponent);
            if(expofExp >= 100000)  // -eee5.00     I'm lazy.
                return getLoc('errorBinExpLimit');
            if(expofExp >= 10000)   // -ee10000
                return `${s[0]}ee${expofExp.toFixed(0)}`;
            if(expofExp >= 1000)    // -ee1000.
                return `${s[0]}ee${expofExp.toFixed(0)}.`;
            if(expofExp >= 100)     // -ee100.0
                return `${s[0]}ee${expofExp.toFixed(1)}`;
            if(expofExp >= 10)      // -ee10.00
                return `${s[0]}ee${expofExp.toFixed(2)}`;
                                    // -ee6.000
            return `${s[0]}ee${expofExp.toFixed(3)}`;
        }
        if(exponent >= 100000)  // -e100000
            return `${s[0]}e${exponent}`;
        if(exponent >= 10000)   // -1e10000
            return `${s.slice(0, 2)}e${exponent}`;
        if(exponent >= 1000)    // -1.e1000
            return `${s.slice(0, 2)}.e${exponent}`;
        if(exponent >= 100)     // -1.0e100
            return `${s.slice(0, 2)}.${s[2]}e${exponent}`;
        if(exponent >= 10)      // -1.00e10
            return `${s.slice(0, 2)}.${s.slice(2, 4)}e${exponent}`;
                                // -1.000e9
        return `${s.slice(0, 2)}.${s.slice(2, 5)}e${exponent}`;
    }
    // Positive
    if(exponent >= 1000000)
    {
        let expofExp = Math.log10(exponent);
        if(expofExp >= 1000000) // eee6.000     I'm lazy.
            return getLoc('errorBinExpLimit');
        if(expofExp >= 100000)  // ee100000
            return `ee${expofExp.toFixed(0)}`;
        if(expofExp >= 10000)   // ee10000.
            return `ee${expofExp.toFixed(0)}.`;
        if(expofExp >= 1000)    // ee1000.0
            return `ee${expofExp.toFixed(1)}`;
        if(expofExp >= 100)     // ee100.00
            return `ee${expofExp.toFixed(2)}`;
        if(expofExp >= 10)      // ee10.000
            return `ee${expofExp.toFixed(3)}`;
                                // ee6.0000
        return `ee${expofExp.toFixed(4)}`;
    }
    if(exponent >= 100000)  // 1e100000
        return `${s[0]}e${exponent}`;
    if(exponent >= 10000)   // 1.e10000
        return `${s[0]}.e${exponent}`;
    if(exponent >= 1000)    // 1.0e1000
        return `${s[0]}.${s[1]}e${exponent}`;
    if(exponent >= 100)     // 1.00e100
        return `${s[0]}.${s.slice(1, 3)}e${exponent}`;
    if(exponent >= 10)      // 1.000e10
        return `${s[0]}.${s.slice(1, 4)}e${exponent}`;
                            // 1.0000e9
    return `${s[0]}.${s.slice(1, 5)}e${exponent}`;
}

let getShorterString = (n) =>
{
    let s = n.toString();
    if(s.length > 7)
        s = `${s.slice(0, 2)}...${s.slice(-4)}`;
    return s;
}

let getShorterBinaryString = (n) =>
{
    let s = BigInt(n).toString(2);
    if(s.length > 7)
        s = `${s.slice(0, 1)}...${s.slice(-5)}`;
    return s;
}

let getStringForm = (n, numMode = 0) =>
{ 
    switch(numMode)
    {
        case 0:
            return getShortString(n);
        case 1:
            return BigNumber.from(n).toString(0);
        case 2:
            return getShortBinaryString(n);
        case 3:
            return getSciBinString(n);
        default:
            return getLoc('errorInvalidNumMode');
    }
}

let getSequence = (sequence, numMode = 0, idxMode = 0) =>
{
    let result = '\\begin{array}{rrr}';
    let i = 0;
    let start;
    let oldFormat = false;
    for(key in sequence)
    {
        if(i)
            result += '\\\\';
        else
        {
            start = Number(key) - 1;
            if(typeof sequence[key] === 'string')
                oldFormat = true;
        }
        if(oldFormat)
            result += `${idxMode ? Number(key) - start : '?'}:&
            ${getStringForm(sequence[key], numMode)}&
            (${key & 1 ? '+1' : '-1'})`;
        else
            result += `${idxMode ? Number(key) - start : sequence[key][0]}:&
            ${getStringForm(sequence[key][1], numMode)}&
            (${key & 1 ? '+1' : '-1'})`;
        ++i;
    }
    result += '&\\end{array}';

    return Utils.getMath(result);
}

let binarySearch = (arr, target) =>
{
    let l = Number(arr[0]);
    let r = Number(arr[arr.length - 1]);
    while(l < r)
    {
        let m = Math.floor((l + r) / 2);
        if(lastHistory[m][0] <= target)
            l = m + 1;
        else
            r = m;
    }
    return l;
}

var init = () =>
{
    currency = theory.createCurrency();
    // EcCurrency = theory.createCurrency('Σc', '\\Sigma c');
    /* Freeze
    Freeze c's value and the timer in place, which allows for idling. This will
    become more important later on, and also helps with farming c levels.
    */
    {
        freeze = theory.createSingularUpgrade(3, currency, new FreeCost);
        freeze.getDescription = () => Localization.format(getLoc(
        'freezeDesc')[freeze.level & 1], Utils.getMath('c'));
        freeze.getInfo = () => getLoc('freezeInfo')[freeze.level & 1];
    }
    /* Nudge c
    The theory's core mechanic revolves around nudging c around. This upgrade
    alternates between incrementing and decrementing by 1. If an increment nudge
    is used on a number divisible by 4, the next number will become divisible by
    4 again, which can be super annoying.
    */
    {
        let getDesc = (level) => `c \\leftarrow c${(level + totalIncLevel) & 1 ?
        '-' : '+'}1\\text{${getLoc('alternating')}}`;
        nudge = theory.createUpgrade(0, currency, new FreeCost);
        nudge.getDescription = (_) => Utils.getMath(
        getDesc(nudge.level));
        nudge.getInfo = (_) => `${(nudge.level + totalIncLevel) & 1 ?
        Localization.getUpgradeDecCustomInfo('c', 1) :
        Localization.getUpgradeIncCustomInfo('c', 1)}${getLoc('alternating')}`;
        nudge.bought = (amount) =>
        {
            if(nudge.isAutoBuyable)
            {
                nudge.refund(amount);
                return;
            }
            if(writeHistory)
                history[totalIncLevel + nudge.level] = [turns, c.toString()];
            // even level: -1, odd level: +1, because this is post-processing
            if((nudge.level + totalIncLevel) & 1)
                c += 1n;
            else
                c -= 1n;
            cBigNum = BigNumber.from(c);

            if(nudge.level == nudge.maxLevel)
            {
                updateAvailability();
                theory.invalidateSecondaryEquation();
            }
            theory.invalidatePrimaryEquation();
            theory.invalidateTertiaryEquation();
        }
        nudge.isAutoBuyable = false;
        nudge.maxLevel = cLevelCap[0];
    }
    /* q1 (c1 prior to 0.06)
    Non-standard (2, 8) stepwise power.
    Ratios against q2: 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8
    Ratios against q3: 6, 6.67, 7.33, 8, 8.67, 9.33, 10, 10.67
    */
    {
        let getLevelPrefix = (level) =>
        {
            if(!level)
                return '';
            let b = getq1BonusLevels(level);
            return `_{(+${b >= borrowCap ? b : b.toFixed(2)})}\\,`;
        };
        let getDesc = (level) => `q_1=${getq1(level).toString(0)}`;
        let getInfo = (level) =>
        {
            if(q1ExpMs.level > 0)
                return `q_1^{${getq1Exponent(q1ExpMs.level)}}=
                ${getq1(level).pow(getq1Exponent(q1ExpMs.level)).toString()}`;

            return getDesc(level);
        }
        q1 = theory.createUpgrade(1, currency, q1Cost);
        q1.getDescription = (_) => Utils.getMath(
        getLevelPrefix(q1BorrowMs.level) + getDesc(q1.level));
        q1.getInfo = (amount) => Utils.getMathTo(
        getLevelPrefix(q1BorrowMs.level) + getInfo(q1.level),
        getInfo(q1.level + amount));
    }
    /* q2 (c2 prior to 0.06)
    Standard doubling upgrade.
    */
    {
        let getDesc = (level) => `q_2=2^{${level}}`;
        let getInfo = (level) => `q_2=${getq2(level).toString(0)}`;
        q2 = theory.createUpgrade(2, currency, q2Cost);
        q2.getDescription = (_) => Utils.getMath(getDesc(q2.level));
        q2.getInfo = (amount) => Utils.getMathTo(getInfo(q2.level),
        getInfo(q2.level + amount));
    }
    /* q3 (q2 prior to 0.08)
    Standard tripling upgrade.
    */
    {
        let getDesc = (level) => `q_3=3^{${level}}${marathonBadge ? '+1' : ''}`;
        let getInfo = (level) => `q_3=${getq3(level).toString(0)}`;
        q3 = theory.createUpgrade(3, currency, q3Cost);
        q3.getDescription = (_) => Utils.getMath(getDesc(q3.level));
        q3.getInfo = (amount) => Utils.getMathTo(getInfo(q3.level),
        getInfo(q3.level + amount));
        q3.isAvailable = false;
    }
    /* Increment c
    Unlike nudge, this upgrade does not change polarity. It is stronger in
    negative than positive.
    */
    {
        let getDesc = (level) => `c\\leftarrow c
        ${c < 0n ? '-' : '+'}1;\\enspace r=${getr(level).toString(0)}`;
        let getInfo = (level) => `r=${getr(level).toString(0)}`;
        extraInc = theory.createUpgrade(4, currency, extraIncCost);
        extraInc.getDescription = () => Utils.getMath(getDesc(
        extraInc.level));
        extraInc.getInfo = (amount) => Utils.getMathTo(getInfo(extraInc.level),
        getInfo(extraInc.level + amount));
        extraInc.bought = (_) =>
        {
            if(extraInc.isAutoBuyable)
            {
                extraInc.refund(1);
                return;
            }
            if(c < 0n)
                c -= 1n;
            else
                c += 1n;
            cBigNum = BigNumber.from(c);

            theory.invalidatePrimaryEquation();
            theory.invalidateTertiaryEquation();
        }
        extraInc.isAutoBuyable = false;
        extraInc.isAvailable = false;
    }

    theory.createPublicationUpgrade(0, currency, permaCosts[0]);
    theory.createBuyAllUpgrade(1, currency, permaCosts[1]);
    theory.createAutoBuyerUpgrade(2, currency, permaCosts[2]);
    theory.autoBuyerUpgrade.bought = (_) => updateAvailability();
    /* Toggle base
    QoL!
    */
    {
        basePerma = theory.createPermanentUpgrade(10, currency, new FreeCost);
        basePerma.getDescription = () => getLoc('btnBaseMode')[
        (historyNumMode & 2) >> 1];
        basePerma.info = Localization.format(getLoc('permaBaseInfo'),
        Utils.getMath('c'));
        basePerma.bought = (_) =>
        {
            basePerma.level = 0;
            historyNumMode = historyNumMode ^ 2;
            theory.invalidatePrimaryEquation();
            theory.invalidateTertiaryEquation();
        }
    }
    /* Unlocks freeze
    Shame that you unlock such a useful tool really late.
    */
    {
        freezePerma = theory.createPermanentUpgrade(3, currency,
        new ConstantCost(permaCosts[3]));
        freezePerma.description = Localization.getUpgradeUnlockDesc(getLoc(
        'permaFreeze'));
        freezePerma.info = Localization.getUpgradeUnlockInfo(getLoc(
        'permaFreeze'));
        freezePerma.bought = (_) => updateAvailability();
        freezePerma.maxLevel = 1;
    }
    /* Mimick history
    Now that's quality of life.
    */
    {
        mimickPerma = theory.createPermanentUpgrade(5, currency,
        new ConstantCost(permaCosts[5]));
        mimickPerma.description = Localization.format(getLoc('permaMimick'),
        Utils.getMath('c'));
        mimickPerma.info = getLoc('permaMimickInfo');
        mimickPerma.bought = (_) => updateAvailability();
        mimickPerma.maxLevel = 1;
    }
    /* Extra increments
    Generally used to aid with catching up. Not sure if it's actually effective.
    */
    {
        extraIncPerma = theory.createPermanentUpgrade(4, currency,
        new ConstantCost(permaCosts[4]));
        extraIncPerma.description = Localization.getUpgradeUnlockDesc(getLoc(
        'permaIncrement'));
        extraIncPerma.info = Localization.format(getLoc('permaIncrementInfo'),
        Utils.getMath('c'));
        extraIncPerma.maxLevel = 1;
        extraIncPerma.bought = (_) => updateAvailability();
    }
    /* Preserve c
    We had the chance to test out this one. It breaks progression, and poses a
    threat to the theory's performance.
    */
    {
        freeEclog = theory.createPermanentUpgrade(9001, currency,
        new FreeCost);
        freeEclog.description = 'Gain ten Eclogs for free';
        freeEclog.info = 'Yields 10 Eclogs';
        freeEclog.bought = (_) => totalEclog += 10;
        freeEclog.isAvailable = haxEnabled;
    }

    theory.setMilestoneCost(milestoneCost);
    /* Interval speed-up
    Technically, this is a c level cap milestone coupled with a drawback. This
    allows you to farm for the borrow milestone faster.
    */
    {
        let getInfo = (level, amount = 1) => `${getLoc('cooldownInfo')}=
        ${cooldown[level] || cooldown[level - amount]}`;
        cooldownMs = theory.createMilestoneUpgrade(0, cooldown.length - 1);
        cooldownMs.getDescription = (amount) =>
        {
            let cd = Localization.getUpgradeDecCustomDesc(getLoc(
            'cooldown'), Localization.format(getLoc('nTicks'),
            cooldown[cooldownMs.level] - cooldown[cooldownMs.level + amount] ||
            0));
            let cap = Localization.getUpgradeIncCustomDesc(getLoc(
            'cLevelCap'), cLevelCap[cooldownMs.level + amount] -
            cLevelCap[cooldownMs.level] || 0);
            return `${cd}; ${cap}`;
        };
        cooldownMs.getInfo = (amount) =>
        {
            let cd = `${getLoc('cooldownInfo')} = ${Utils.getMathTo(
            cooldown[cooldownMs.level], cooldown[cooldownMs.level + amount] ||
            cooldown[cooldownMs.level])}`;
            let cap = `${Utils.getMath(getLoc('cLevelCap'))} = 
            ${Utils.getMathTo(cLevelCap[cooldownMs.level],
            cLevelCap[cooldownMs.level + amount] ||
            cLevelCap[cooldownMs.level])}`;
            return `${cd}; ${cap}`;
        }
        cooldownMs.boughtOrRefunded = (_) =>
        {
            updateAvailability();
            nudge.maxLevel = cLevelCap[cooldownMs.level];
        };
        cooldownMs.canBeRefunded = (amount) => nudge.level <=
        cLevelCap[cooldownMs.level - amount] && !q1ExpMs.level &&
        !q3UnlockMs.level;
    }
    /* Level borrowing
    It'll be useless for a while at first when you unlock it at e44. But, it can
    be farmed simply by doing a bunch of empty publishes at 1.00 multiplier.
    */
    {
        q1BorrowMs = theory.createMilestoneUpgrade(1, 1);
        q1BorrowMs.description = Localization.getUpgradeIncCustomDesc(getLoc(
        'q1Level'), Localization.format(getLoc('Eclog'), borrowFactor));
        q1BorrowMs.info = Localization.format(getLoc('EclogInfo'), borrowCap);
        q1BorrowMs.canBeRefunded = (_) => !q1ExpMs.level && !q3UnlockMs.level;
        q1BorrowMs.boughtOrRefunded = (_) =>
        {
            updateAvailability();
        };
    }
    /* q1 exponent
    Standard exponent upgrade.
    */
    {
        q1ExpMs = theory.createMilestoneUpgrade(2, q1ExpMaxLevel);
        q1ExpMs.description = Localization.getUpgradeIncCustomExpDesc('q_1',
        q1ExpInc);
        q1ExpMs.info = Localization.getUpgradeIncCustomExpInfo('q_1', q1ExpInc);
        q1ExpMs.boughtOrRefunded = (_) =>
        {
            updateAvailability();
            theory.invalidateSecondaryEquation();
        };
    }
    /* q3 unlock
    Standard unlock.
    */
    {
        q3UnlockMs = theory.createMilestoneUpgrade(3, 1);
        q3UnlockMs.description = Localization.getUpgradeAddTermDesc('q_3');
        q3UnlockMs.info = Localization.getUpgradeAddTermInfo('q_3');
        q3UnlockMs.boughtOrRefunded = (_) =>
        {
            updateAvailability();
            theory.invalidateSecondaryEquation();
        };
    }

    theory.createStoryChapter(0, getLoc('ch1Title'), getLoc('ch1Text'),
    () => true);
    theory.createStoryChapter(1, getLoc('ch2Title'), getLoc('ch2Text'),
    () => totalIncLevel >= 480);
    theory.createStoryChapter(2, getLoc('ch3Title'), getLoc('ch3Text'),
    () => totalIncLevel >= 1000);
    theory.createStoryChapter(3, getLoc('ch3bTitle'), getLoc('ch3bText'),
    () => theory.storyChapters[2].isUnlocked && c!= 0n && mimickLastHistory);
    theory.createStoryChapter(4, getLoc('ch4Title'), getLoc('ch4Text'),
    () => totalIncLevel >= 1780);
    theory.createStoryChapter(5, getLoc('ch5Title'), getLoc('ch5Text'),
    () => totalIncLevel >= 4000);
    theory.createStoryChapter(6, getLoc('ch6Title'), getLoc('ch6Text'),
    () => totalIncLevel >= 4400);
    finalChapter = theory.createStoryChapter(7, getLoc('ch7Title'),
    Localization.format(getLoc('ch7Text'), borrowCap),
    () => getq1BonusLevels(q1BorrowMs.level) >= borrowCap);

    theory.createAchievement(0, undefined, getLoc('achNegativeTitle'),
    getLoc('achNegativeDesc'), () => cBigNum < 0);
    theory.createAchievement(1, undefined, getLoc('achMarathonTitle'),
    getLoc('achMarathonDesc'), () => cBigNum.abs() >= BigNumber.from(1e48) &&
    extraInc.level == 0, () => c == 0n ? 0 :
    cBigNum.abs().log10().toNumber() / 48);
    theory.createAchievement(2, undefined, getLoc('achSixNineTitle'),
    getLoc('achSixNineDesc'), () => c == 69n);

    updateAvailability();

    theory.primaryEquationHeight = 66;
    theory.primaryEquationScale = 0.9;
    theory.secondaryEquationHeight = 52;
}

var updateAvailability = () =>
{
    if(theory.autoBuyerUpgrade.level)
    {
        historyFrame.isVisible = true;
        historyLabel.isVisible = true;
    }

    freezePerma.isAvailable = theory.autoBuyerUpgrade.level > 0;
    freeze.isAvailable = freezePerma.level > 0;

    mimickPerma.isAvailable = theory.autoBuyerUpgrade.level > 0;
    if(mimickPerma.level)
    {
        mimickFrame.isVisible = true;
        mimickLabel.isVisible = true;
    }

    extraIncPerma.isAvailable = mimickPerma.level > 0;
    extraInc.isAvailable = extraIncPerma.level > 0 &&
    nudge.level == nudge.maxLevel;

    q1ExpMs.isAvailable = cooldownMs.level == cooldownMs.maxLevel &&
    q1BorrowMs.level == q1BorrowMs.maxLevel;
    q3UnlockMs.isAvailable = q1ExpMs.isAvailable;
    q3.isAvailable = q3UnlockMs.level > 0;
    marathonBadge = theory.achievements[1].isUnlocked;
}

var tick = (elapsedTime, multiplier) =>
{
    nudge.isAutoBuyable = false;
    extraInc.isAutoBuyable = false;

    if(nudge.level && freeze.level % 2 == 0)
    {
        time += elapsedTime * 10;
        let turned = false;
        while(time + 1e-8 >= cooldown[cooldownMs.level])
        {
            turned = true;
            time -= cooldown[cooldownMs.level];
            cIterProgBar.progressTo(0, mimickLastHistory &&
            nextNudge in lastHistory && turns == lastHistory[nextNudge][0] - 2 ?
            0 : 33, Easing.LINEAR);

            cSum += cBigNum;
            cLog = cSum.max(BigNumber.ONE).log10().toNumber();

            if(c % 2n != 0)
                c = 3n * c + 1n;
            else
                c /= 2n;
            cBigNum = BigNumber.from(c);

            // Only counts if c != 0
            if(nudge.level)
                ++turns;

            if(mimickLastHistory)
            {
                while(nextNudge in lastHistory &&
                turns == lastHistory[nextNudge][0])
                {
                    nudge.buy(1);
                    ++nextNudge;
                }
            }

            theory.invalidatePrimaryEquation();
            theory.invalidateTertiaryEquation();
        }
        if(!turned)
            cIterProgBar.progressTo(Math.min(1,
            (time / (cooldown[cooldownMs.level] - 1)) ** 1.5), 105,
            Easing.LINEAR);
    }

    let dt = BigNumber.from(elapsedTime * multiplier);
    let tTerm = BigNumber.from(turns);
    let q1Term = getq1(q1.level).pow(getq1Exponent(q1ExpMs.level));
    let q2Term = getq2(q2.level);
    let q3Term = q3UnlockMs.level > 0 ? getq3(q3.level) : BigNumber.ONE;
    let bonus = theory.publicationMultiplier;
    let rTerm = nudge.level == nudge.maxLevel ? getrPenalty(extraInc.level) :
    BigNumber.ONE;

    currency.value += dt * tTerm * cSum.abs() * q1Term * q2Term * q3Term * bonus
    / rTerm;
    // EcCurrency.value = cSum;
}

var getEquationOverlay = () =>
{
    let result = ui.createGrid
    ({
        // rowDefinitions: ['1*', '1*'],
        columnDefinitions: ['1*', '2*', '1*'],
        children:
        [
            // For reference
            // ui.createFrame({row: 0, column: 2}),
            // ui.createFrame({row: 1, column: 2}),
            ui.createLatexLabel
            ({
                row: 0,
                column: 0,
                verticalTextAlignment: TextAlignment.START,
                margin: new Thickness(6, 3),
                text: getLoc('versionName'),
                fontSize: 9,
                textColor: Color.TEXT_MEDIUM
            }),
            ui.createFrame
            ({
                row: 0,
                column: 1,
                hasShadow: true,
                verticalOptions: LayoutOptions.START,
                cornerRadius: 1,
                content: cIterProgBar
            }),
            historyFrame,
            historyLabel,
            // ui.createLatexLabel
            // ({
            //     row: 1,
            //     column: 2,
            //     horizontalOptions: LayoutOptions.END,
            //     verticalTextAlignment: TextAlignment.END,
            //     margin: new Thickness(6, 3),
            //     text: () => longTickMsg,
            //     fontSize: 9,
            //     textColor: Color.TEXT_MEDIUM
            // }),
            mimickFrame,
            mimickLabel
        ]
    });
    return result;
}

var getPrimaryEquation = () =>
{
    let cStr = historyNumMode & 2 ? getShortBinaryString(c) :
    getShortString(c);
    let evenClause = Localization.format(getLoc('condition'),
    `c\\equiv0\\text{ (mod 2)}`);
    let oddClause = Localization.format(getLoc('condition'),
    `c\\equiv1\\text{ (mod 2)}`);
    let result = `\\begin{matrix}c\\leftarrow\\begin{cases}c/2&${evenClause}\\\\
    3c+1&${oddClause}\\end{cases}\\\\\\\\
    \\color{#${cDispColour.get(game.settings.theme)}}
    {=${cStr}${historyNumMode & 2 ? '_2' : ''}}\\end{matrix}`;

    return result;
}

var getSecondaryEquation = () =>
{
    let EcStr = extraIncPerma.level > 0 && nudge.level == nudge.maxLevel ?
    '\\displaystyle\\frac{\\left|\\Sigma c\\right|}{2^{2r}}' :
    '\\left|\\sum c\\right|';
    let result = `\\begin{matrix}\\dot{\\rho}=t{\\mkern 1mu}q_1
    ${q1ExpMs.level > 0 ?`^{${getq1Exponent(q1ExpMs.level)}}` : ''}q_2
    ${q3UnlockMs.level > 0 ? 'q_3' : ''}\\times${EcStr}\\\\\\\\
    ${theory.latexSymbol}=\\max{\\rho}^{${tauRate}}\\end{matrix}`;

    return result;
}

var getTertiaryEquation = () =>
{
    let tStr = `t=${turns}`;
    let cStr = '';
    if(historyNumMode & 2 || c > 1e9 || c < -1e8)
        cStr = `,&c=${cBigNum.toString(0)}`;
    let csStr = `\\Sigma c=${cSum.toString(0)}`;

    return `\\begin{array}{c}\\begin{matrix}${tStr}${cStr}\\end{matrix}\\\\
    ${csStr}\\end{array}`;
}

let createHistoryMenu = () =>
{
    let toggleIdxMode = () =>
    {
        historyIdxMode ^= 1;
        currentPubHistory.text = getSequence(history, historyNumMode,
        historyIdxMode);
        toggleIdxButton.text = getLoc('btnIndexingMode')[historyIdxMode & 1];
    }
    let toggleIdxButton = ui.createButton
    ({
        column: 0,
        text: getLoc('btnIndexingMode')[historyIdxMode & 1],
        onClicked: () =>
        {
            Sound.playClick();
            toggleIdxMode();
        }
    });
    let toggleNotationMode = () =>
    {
        historyNumMode = historyNumMode ^ 1;
        currentPubHistory.text = getSequence(history, historyNumMode,
        historyIdxMode);
        toggleNumButton.text = getLoc('btnNotationMode')[historyNumMode & 1];
    };
    let toggleNumButton = ui.createButton
    ({
        column: 1,
        text: getLoc('btnNotationMode')[historyNumMode & 1],
        onClicked: () =>
        {
            Sound.playClick();
            toggleNotationMode();
        }
    });
    let currentPubHistory = ui.createLatexLabel
    ({
        row: 2,
        column: 0,
        text: getSequence(history, historyNumMode, historyIdxMode),
        margin: new Thickness(0, 0, 3, 0),
        horizontalTextAlignment: TextAlignment.CENTER,
    });
    let lastPubHistory = ui.createLatexLabel
    ({
        row: 2,
        column: 1,
        text: () =>
        {
            if(!lastHistoryStrings[historyIdxMode][historyNumMode])
                lastHistoryStrings[historyIdxMode][historyNumMode] =
                getSequence(lastHistory, historyNumMode, historyIdxMode);
            return lastHistoryStrings[historyIdxMode][historyNumMode];
        },
        margin: new Thickness(3, 0, 0, 0),
        horizontalTextAlignment: TextAlignment.CENTER,
    });
    let historyGrid = ui.createGrid
    ({
        rowDefinitions:
        [
            'auto',
            'auto',
            'auto'
        ],
        columnDefinitions: ['1*', '1*'],
        columnSpacing: 0,
        children:
        [
            ui.createLatexLabel
            ({
                row: 0,
                column: 0,
                margin: new Thickness(0, 2, 0, 0),
                text: getLoc('labelCurrentRun'),
                horizontalTextAlignment: TextAlignment.CENTER,
                verticalTextAlignment: TextAlignment.END
            }),
            ui.createLatexLabel
            ({
                row: 0,
                column: 1,
                margin: new Thickness(0, 2, 0, 0),
                text: getLoc('labelLastRun'),
                horizontalTextAlignment: TextAlignment.CENTER,
                verticalTextAlignment: TextAlignment.END
            }),
            ui.createBox
            ({
                row: 1,
                column: 0,
                heightRequest: 1,
                margin: new Thickness(0, 6)
            }),
            ui.createBox
            ({
                row: 1,
                column: 1,
                heightRequest: 1,
                margin: new Thickness(0, 6)
            }),
            currentPubHistory,
            lastPubHistory
        ]
    });
    let preserveSwitch = ui.createSwitch
    ({
        isToggled: preserveLastHistory,
        row: 0,
        column: 1,
        horizontalOptions: LayoutOptions.END,
        onTouched: (e) =>
        {
            if(e.type == TouchType.SHORTPRESS_RELEASED ||
            e.type == TouchType.LONGPRESS_RELEASED)
            {
                Sound.playClick();
                preserveLastHistory = !preserveLastHistory;
                preserveSwitch.isToggled = preserveLastHistory;
            }
        }
    });

    let menu = ui.createPopup
    ({
        isPeekable: true,
        title: getLoc('menuHistory'),
        content: ui.createStackLayout
        ({
            children:
            [
                ui.createGrid
                ({
                    rowDefinitions: [getBtnSize(ui.screenWidth)],
                    columnDefinitions: ['1*', '1*'],
                    columnSpacing: 8,
                    margin: new Thickness(0, 6),
                    children:
                    [
                        toggleIdxButton,
                        toggleNumButton
                    ]
                }),
                // ui.createBox
                // ({
                //     heightRequest: 1,
                //     margin: new Thickness(0, 6)
                // }),
                ui.createScrollView
                ({
                    heightRequest: ui.screenHeight * 0.32,
                    content: historyGrid,
                    orientation: ScrollOrientation.BOTH
                }),
                ui.createBox
                ({
                    heightRequest: 1,
                    margin: new Thickness(0, 6)
                }),
                ui.createGrid
                ({
                    rowDefinitions: [getImageSize(ui.screenWidth)],
                    columnDefinitions: ['4*', '1*'],
                    margin: new Thickness(0, 0, 0, 6),
                    children:
                    [
                        ui.createLatexLabel
                        ({
                            text: getLoc('labelPreserve'),
                            row: 0,
                            column: 0,
                            verticalTextAlignment: TextAlignment.CENTER
                        }),
                        preserveSwitch
                    ]
                }),
                ui.createButton
                ({
                    text: getLoc('btnClose'),
                    onClicked: () =>
                    {
                        Sound.playClick();
                        menu.hide();
                    }
                })
            ]
        })
    });
    return menu;
}

// Check out the Giant's Causeway in Ireland!
var get2DGraphValue = () =>
{
    if(cBigNum == BigNumber.ZERO)
        return 0;
    
    return (cBigNum.abs().log10() * cBigNum.sign).toNumber();
}

var getTau = () => currency.value.pow(tauRate);

var getCurrencyFromTau = (tau) =>
[
    tau.max(BigNumber.ONE).pow(BigNumber.ONE / tauRate),
    currency.symbol
];

// Will not trigger if you press reset.
var prePublish = () =>
{
    totalEclog += cLog;
    totalIncLevel += nudge.level;
    if(!preserveLastHistory)
    {
        lastHistory = history;
        lastHistoryStrings = [[], []];
    }
    lastHistoryLength = Object.keys(lastHistory).length;
}

var postPublish = () =>
{
    turns = 0;
    time = 0;
    // Disabling history write circumvents the extra levelling
    writeHistory = false;
    nudge.maxLevel = cLevelCap[cooldownMs.level];
    nudge.level = 0;
    writeHistory = true;
    history = {};
    // c is reset to 0 afterwards

    c = 0n;
    cBigNum = BigNumber.from(c);
    cSum = cBigNum;
    cLog = cSum.max(BigNumber.ONE).log10().toNumber();
    cIterProgBar.progressTo(0, 220, Easing.CUBIC_INOUT);

    if(mimickLastHistory)
        nextNudge = binarySearch(Object.keys(lastHistory), turns);

    theory.invalidatePrimaryEquation();
    theory.invalidateSecondaryEquation();
    theory.invalidateTertiaryEquation();
    updateAvailability();

    theory.clearGraph();
}

var canResetStage = () => true;

var getResetStageMessage = () => getLoc('reset');

var resetStage = () =>
{
    totalIncLevel += nudge.level;

    for(let i = 0; i < theory.upgrades.length; ++i)
        theory.upgrades[i].level = 0;

    currency.value = 0;

    turns = 0;
    time = 0;
    // Disabling history write circumvents the extra levelling
    writeHistory = false;
    nudge.maxLevel = cLevelCap[cooldownMs.level];
    nudge.level = 0;
    writeHistory = true;
    history = {};
    // c is reset to 0 afterwards

    c = 0n;
    cBigNum = BigNumber.from(c);
    cIterProgBar.progressTo(0, 220, Easing.CUBIC_INOUT);

    if(mimickLastHistory)
        nextNudge = binarySearch(Object.keys(lastHistory), turns);

    theory.invalidatePrimaryEquation();
    theory.invalidateSecondaryEquation();
    theory.invalidateTertiaryEquation();
    updateAvailability();
}

var getInternalState = () => JSON.stringify
({
    haxEnabled: haxEnabled,
    version: version,
    turns: turns,
    time: time,
    c: c.toString(),
    cSum: cSum.toBase64String(),
    totalEclog: totalEclog,
    totalIncLevel: totalIncLevel,
    history: history,
    lastHistory: lastHistory,
    lastHistoryStrings: lastHistoryStrings,
    historyNumMode: historyNumMode,
    historyIdxMode: historyIdxMode,
    mimickLastHistory: mimickLastHistory,
    preserveLastHistory: preserveLastHistory,
})

var setInternalState = (stateStr) =>
{
    if(!stateStr)
        return;

    let state = JSON.parse(stateStr);

    if('haxEnabled' in state)
    {
        haxEnabled = state.haxEnabled;
        freeEclog.isAvailable = haxEnabled;
    }

    if('turns' in state)
        turns = state.turns;
    if('time' in state)
    {
        time = state.time;
        cIterProgBar.progress = Math.min(1,
        (time / (cooldown[cooldownMs.level] - 1)) ** 1.5);
    }
    if('c' in state)
    {
        c = BigInt(state.c);
        cBigNum = BigNumber.from(c);
    }
    if('cSum' in state)
    {
        cSum = BigNumber.fromBase64String(state.cSum);
        cLog = cSum.max(BigNumber.ONE).log10().toNumber();
    }
    if('totalEclog' in state)
        totalEclog = state.totalEclog;

    if('totalIncLevel' in state)
    {
        totalIncLevel = state.totalIncLevel;
        nudge.maxLevel = cLevelCap[cooldownMs.level];
    }

    if('history' in state)
        history = state.history;

    if('mimickLastHistory' in state)
        mimickLastHistory = mimickPerma.level > 0 ?
        state.mimickLastHistory : false;
    if('preserveLastHistory' in state)
        preserveLastHistory = state.preserveLastHistory;
    if('lastHistory' in state)
    {
        lastHistory = state.lastHistory;
        LHObj = Object.keys(lastHistory);
        lastHistoryLength = LHObj.length;
        if(mimickLastHistory)
            nextNudge = binarySearch(LHObj, turns);
    }
    if('lastHistoryStrings' in state)
        lastHistoryStrings = state.lastHistoryStrings;
    if('historyNumMode' in state)
        historyNumMode = state.historyNumMode;
    if('historyIdxMode' in state)
        historyIdxMode = state.historyIdxMode;

    theory.invalidatePrimaryEquation();
    theory.invalidateTertiaryEquation();
}

init();
