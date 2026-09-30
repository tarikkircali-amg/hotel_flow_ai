'use strict';

// Akan metni Twilio ConversationRelay'e token token gonderir.
//
// `last: true` yalnizca son parcada gonderilmeli; akis sirasinda hangi parcanin
// son oldugunu bilemeyiz. Cozum: bir parca geriden gitmek. N'inci parcayi,
// N+1 geldiginde yolluyoruz; akis bitince elde kalani last=true ile yolluyoruz.
//
// Bos token gondermiyoruz - Twilio bos token'i reddediyor.

class SesYazici {
  constructor(ws) {
    this.ws = ws;
    this.bekleyen = null;
    this.kapali = false;
  }

  yaz(parca) {
    if (this.kapali || !parca) return;
    if (this.bekleyen !== null) this.#gonder(this.bekleyen, false);
    this.bekleyen = parca;
  }

  bitir() {
    if (this.kapali) return;
    if (this.bekleyen !== null) {
      this.#gonder(this.bekleyen, true);
      this.bekleyen = null;
    }
  }

  /** Hasta sozu kesti: bekleyen parcayi dusur. */
  iptal() {
    this.bekleyen = null;
  }

  #gonder(token, son) {
    if (this.ws.readyState !== this.ws.OPEN) return;
    this.ws.send(JSON.stringify({ type: 'text', token, last: son, interruptible: true }));
  }
}

module.exports = { SesYazici };
