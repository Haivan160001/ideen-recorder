// Testlauf fuer assembleTranscript im Windows Script Host:
//
//     cscript //nologo //E:JScript test-assemble.js
//
// Laedt genau die Datei, die auch die App ausliefert - kein Duplikat, das
// auseinanderlaufen koennte. Die Faelle unter "Echte Bruchstuecke" stammen aus
// einer tatsaechlichen Aufnahme auf einem Galaxy S10 (Android 12, Chrome 152).

var fso = new ActiveXObject('Scripting.FileSystemObject');
var APP = fso.BuildPath(fso.GetParentFolderName(WScript.ScriptFullName), 'assemble.js');

function readUtf8(path) {
    var st = new ActiveXObject('ADODB.Stream');
    st.Type = 2; st.Charset = 'utf-8'; st.Open(); st.LoadFromFile(path);
    var s = st.ReadText(); st.Close();
    return s;
}

eval(readUtf8(APP));

var pass = 0, fail = 0;

function check(name, chunks, expected) {
    var got = assembleTranscript(chunks);
    if (got === expected) {
        pass++;
        WScript.Echo('  OK    ' + name);
    } else {
        fail++;
        WScript.Echo('  FEHL  ' + name);
        WScript.Echo('        erwartet: ' + expected);
        WScript.Echo('        bekommen: ' + got);
    }
}

WScript.Echo('--- Grundfaelle ---');
check('leeres Array', [], '');
check('nur Leerstrings', ['', '   ', ''], '');
check('einzelnes Ergebnis', ['hallo'], 'hallo');
check('identische Wiederholung', ['hallo', 'hallo', 'hallo'], 'hallo');
check('einfaches Wachstum', ['ich', 'ich bin', 'ich bin da'], 'ich bin da');
check('Wachstum mit Ruecksprung', ['ich bin da', 'ich bin'], 'ich bin da');
check('Grossschreibung wechselt', ['ich', 'Ich bin da'], 'Ich bin da');
check('Leerraum wird normalisiert', ['  ich   bin  ', 'ich bin da'], 'ich bin da');

WScript.Echo('');
WScript.Echo('--- Abschnitte, Korrekturen, Ueberlappung ---');
check('zwei echte Abschnitte', ['Hund', 'Katze'], 'Hund Katze');
check('zwei Abschnitte mit Wachstum', ['a', 'a b', 'c', 'c d'], 'a b c d');
check('nachtraegliche Korrektur',
      ['das ist ein Test heute', 'das ist ein Test morgen'],
      'das ist ein Test morgen');
check('Randueberlappung ein Wort', ['und die', 'die Termine'], 'und die Termine');
check('neuer Abschnitt steckt ganz im alten', ['a b c', 'b c'], 'a b c');

WScript.Echo('');
WScript.Echo('--- Echte Bruchstuecke vom Galaxy S10 (16.09.2026) ---');

// Eintrag 1: reines Wachstum, so wie Chrome die Fassungen geliefert hat.
var echt1 = ['ich',
    'ich brauche', 'ich brauche', 'ich brauche',
    'ich brauche einen', 'ich brauche einen', 'ich brauche einen',
    'ich brauche einen KI', 'ich brauche einen KI', 'ich brauche einen KI',
    'ich brauche einen KI', 'ich brauche einen KI', 'ich brauche einen KI',
    'ich brauche einen KI gestützten', 'ich brauche einen KI gestützten',
    'ich brauche einen KI gestützten Terminkalender'];
check('Eintrag 1 (reines Wachstum)', echt1,
      'ich brauche einen KI gestützten Terminkalender');

// Eintrag 2 enthaelt zusaetzlich eine Selbstkorrektur von Chrome
// ("E-Mails und mein" -> "E-Mail von mein") sowie drei Abschnittswechsel,
// einer davon mit Randueberlappung ("... und die" / "die Termine ...").
var lang = 'der Terminkalender soll meine Outlook E-Mails eine Gmail';
var echt2 = ['der', 'der',
    'der Terminkalender', 'der Terminkalender',
    'der Terminkalender soll', 'der Terminkalender soll',
    'der Terminkalender soll meine', 'der Terminkalender soll meine',
    'der Terminkalender soll meine Outlook', 'der Terminkalender soll meine Outlook',
    'der Terminkalender soll meine Outlook E-Mails',
    lang, lang,
    lang + ' E-Mails und mein gmail Kalender',
    lang + ' E-Mail von mein gmail Kalender',
    'nicht', 'nicht', 'nicht',
    'nicht synchronisieren', 'nicht synchronisieren sondern',
    'aus', 'aus', 'aus durchsuchen und die',
    'die', 'die Termine extrem'];
check('Eintrag 2 (Korrektur + Abschnitte + Ueberlappung)', echt2,
      lang + ' E-Mails und mein gmail Kalender' +
      ' nicht synchronisieren sondern aus durchsuchen und die Termine extrem');

WScript.Echo('');
WScript.Echo('--- Regression: der alte Fehler darf nicht wiederkehren ---');
var wieder = assembleTranscript(echt1);
if (wieder.indexOf('ichich') >= 0 || wieder.indexOf('brauche einen KI brauche') >= 0) {
    fail++; WScript.Echo('  FEHL  Wortsalat ist zurueck: ' + wieder);
} else {
    pass++; WScript.Echo('  OK    kein Wortsalat');
}

WScript.Echo('');
WScript.Echo(pass + ' bestanden, ' + fail + ' fehlgeschlagen');
WScript.Quit(fail === 0 ? 0 : 1);
