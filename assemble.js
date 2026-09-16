/* Baut aus den Teilergebnissen der Spracherkennung den tatsaechlich
 * gesprochenen Text.
 *
 * Chrome auf Android legt jede Zwischenfassung als EIGENEN Eintrag in
 * `results` ab und markiert sie obendrein als endgueltig:
 *
 *     ["der", "der Termin", "der Termin soll", "nicht", "nicht jetzt"]
 *
 * Wer das aneinanderhaengt, bekommt "derder Terminder Termin soll...".
 * Richtig ist: aufeinander aufbauende Fassungen ersetzen einander, und erst
 * ein Eintrag, der nicht mehr auf der laufenden Fassung aufbaut, beginnt einen
 * neuen Abschnitt.
 *
 * Drei Faelle treten in der Praxis auf:
 *   1. Verlaengerung  "der Termin"      -> "der Termin soll"
 *   2. Korrektur      "...E-Mails und"  -> "...E-Mail von"   (gleicher Anfang)
 *   3. Neuer Abschnitt "...und die"     -> "die Termine"     (Rand ueberlappt)
 *
 * Bewusst ohne trim()/map()/indexOf-auf-Arrays geschrieben, damit derselbe
 * Quelltext auch im Windows Script Host laeuft und dort testbar ist.
 */

function assembleTranscript(chunks) {

  function norm(s) {
    return String(s == null ? '' : s).replace(/\s+/g, ' ').replace(/^ | $/g, '');
  }

  function commonPrefixLen(a, b) {
    var n = Math.min(a.length, b.length), i = 0;
    while (i < n && a.charAt(i) === b.charAt(i)) i++;
    return i;
  }

  /* Gehoeren zwei Fassungen zum selben Abschnitt? Entweder ist die eine der
     Anfang der anderen, oder sie teilen einen so langen gemeinsamen Anfang,
     dass es sich um eine nachtraegliche Korrektur handelt. */
  function sameSegment(a, b) {
    var A = a.toLowerCase(), B = b.toLowerCase();
    if (A.length === 0 || B.length === 0) return false;
    if (A.substring(0, B.length) === B) return true;
    if (B.substring(0, A.length) === A) return true;
    var cp = commonPrefixLen(A, B);
    return cp >= 8 && cp >= 0.6 * Math.min(A.length, B.length);
  }

  /* Haengt zwei Abschnitte aneinander und entfernt dabei eine Wortueberlappung
     am Rand, wie sie entsteht, wenn Chrome mitten im Satz neu ansetzt. */
  function joinOverlap(acc, next) {
    if (acc === '') return next;
    if (next === '') return acc;
    var aw = acc.split(' '), nw = next.split(' ');
    var max = Math.min(6, aw.length, nw.length);
    for (var k = max; k >= 1; k--) {
      var same = true;
      for (var i = 0; i < k; i++) {
        if (aw[aw.length - k + i].toLowerCase() !== nw[i].toLowerCase()) { same = false; break; }
      }
      if (same) {
        if (k === nw.length) return acc;              // next steckt schon ganz drin
        return acc + ' ' + nw.slice(k).join(' ');
      }
    }
    return acc + ' ' + next;
  }

  var segs = [], cur = '';

  for (var i = 0; i < chunks.length; i++) {
    var t = norm(chunks[i]);
    if (t === '') continue;
    if (cur === '') { cur = t; continue; }
    if (sameSegment(cur, t)) {
      // Im Zweifel die laengere Fassung behalten - Text zu verlieren waere
      // schlimmer als eine leicht veraltete Korrektur zu behalten.
      if (t.length >= cur.length) cur = t;
    } else {
      segs.push(cur);
      cur = t;
    }
  }
  if (cur !== '') segs.push(cur);

  var out = '';
  for (var j = 0; j < segs.length; j++) out = joinOverlap(out, segs[j]);
  return out;
}

if (typeof module !== 'undefined' && module.exports) module.exports = assembleTranscript;
