# Mobile Viewport & Balance Context

**Gathered:** 2026-10-25
**Spec:** `.specs/features/mobile-viewport-balance/spec.md`
**Status:** Ready for design

---

## Feature Boundary

Dostarczenie pełnej responsywności ekranu bez sztywnego letterboxa (wypełnienie 100% z zachowaniem kwadratowej szachownicy), modularnego HUD-u, kompleksowego wsparcia urządzeń mobilnych (wirtualny joystick, tryb dotykowy hybrydowy i twin-stick, orientacje pozioma i pionowa) oraz rebalansu tempa i długości rozgrywki dopasowanego do formatów szachowych.

---

## Implementation Decisions

### Obsługa celowania na ekranach dotykowych

- **Domyślny tryb:** Hybryda Auto-Aim + Touch Focus (postać automatycznie celuje w najbliższego/najbardziej zagrażającego wroga; dotknięcie dowolnego wroga lub punktu na ekranie pozwala wskazać cel priorytetowy).
- **Tryb opcjonalny:** Twin-Stick Touch (dwie wirtualne gałki ekranowe: lewa do ruchu 360°, prawa do kierunkowego celowania i ostrzału).
- **Przełącznik trybu:** Dostępny w menu wyboru tempa oraz w ustawieniach gry.

### Responsywność Viewportu i Orientacje (Landscape & Portrait)

- **Wsparcie obu orientacji:**
  - *Landscape (horyzontalny):* Szachownica wycentrowana, HUD i wirtualne kontrolki po bokach szachownicy (lewy kciuk = joystick, prawy kciuk = dash, aktywny perk, sklep).
  - *Portrait (wertykalny):* Szachownica wyśrodkowana na środku/górze, HUD na samej górze, cała dolna strefa pod szachownicą dedykowana pod kciuki gracza (ruch i przyciski akcji).
- **Brak czarnych pasów letterbox:** Tło motywu szachownicy proceduralnie pokrywa cały widoczny ekran (otwarty stół).

### Struktura rozgrywki, długość partii i zróżnicowanie trudności

- Zamiast sztywnego 5x22s, czas fali i liczba fal są zróżnicowane według formatu tempa szachowego:
  - *Bullet (Błyskawiczny chaos):* 6 fal po 30 sekund (~3.5 minuty pełnego runu), agresywne telegrafy, wysoki drop żetonów.
  - *Blitz (Zbalansowany standard):* 8 fal po 45 sekund (~6 minut pełnego runu), wyważona eskalacja, Mini-Boss w fali 4, Finał w fali 8.
  - *Rapid (Taktyczna głębia):* 10 fal po 50 sekund (~8.5 minuty pełnego runu), metodyczna rozbudowa buildu, Mini-Boss w fali 5, Rada Królewska w fali 8, Finał w fali 10.
- Czytelność bullet-hellu: sekwencyjne telegrafy wrogów, eliminacja nakładania się niesygnalizowanych salw.

---

## Specific References

- Sterowanie dotykowe inspirowane wzorcem *Brotato / Vampire Survivors Mobile* (płynny floating joystick dla ruchu + auto-target) z opcjonalnym klasycznym twin-stickiem.
- Responsywność zbliżona do nowoczesnych mobilnych gier webowych HTML5 Canvas: canvas dynamicznie dopasowuje się do `window.innerWidth` i `window.innerHeight`.

---

## Deferred Ideas

- Globalny ranking online na serwerze zewnętrznym (poza obecną pamięcią IndexedDB `AM76_CHESS_DB`).
- Dźwiękowe opcje suwaków głośności BGM/SFX (obecnie pojedyncza głośność syntezy ZzFX).

