/**
 * Système d'alertes sonores HACCP — Web Audio API uniquement, sans fichiers externes.
 * Importable depuis n'importe quelle page HACCP.
 */

/**
 * Joue une alerte sonore selon le type.
 * @param {'conforme'|'alerte'|'critique'|'rappel'|'refroidissement'} type
 */
export function playAlert(type) {
  try {
    const ctx  = new (window.AudioContext || window.webkitAudioContext)()
    const beep = (freq, start, dur, wave = 'sine') => {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = wave
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.25, ctx.currentTime + start)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur)
      osc.start(ctx.currentTime + start)
      osc.stop(ctx.currentTime + start + dur + 0.05)
    }

    switch (type) {
      case 'conforme':
        beep(800, 0, 0.10)
        break
      case 'alerte':
        beep(500, 0,    0.20)
        beep(500, 0.30, 0.20)
        break
      case 'critique':
        beep(600, 0,    0.25)
        beep(400, 0.32, 0.25)
        beep(200, 0.64, 0.30)
        break
      case 'rappel':
        beep(600, 0, 0.15, 'sine')
        break
      case 'refroidissement':
        beep(500, 0,    0.15)
        beep(700, 0.22, 0.20)
        break
      default:
        beep(600, 0, 0.15)
    }

    setTimeout(() => ctx.close(), 3000)
  } catch {
    // AudioContext non disponible (ex: test, SSR)
  }
}

/**
 * Vérifie les permissions de notification et programme les alertes HACCP
 * selon les modules actifs dans les settings.
 * @param {string} etablissementId
 * @param {Object} settings - objet settings de l'établissement
 */
export async function scheduleHaccpNotifications(etablissementId, settings) {
  if (!('Notification' in window)) return

  if (Notification.permission === 'default') {
    await Notification.requestPermission()
  }

  if (Notification.permission !== 'granted') return
  if (settings?.haccp_alertes_sonores === false) return

  const timers = []

  const notify = (title, body, delayMs) => {
    const t = setTimeout(() => {
      playAlert('rappel')
      new Notification(title, { body, icon: '/favicon.ico', tag: `haccp-${title}-${Date.now()}` })
    }, delayMs)
    timers.push(t)
  }

  // ── Froid : relevé toutes les 4 h (légal), rappel 30 min avant expiration
  // TODO: idéalement, calculer le délai depuis le dernier relevé en DB.
  // Pour l'instant on programme un rappel à heure fixe (8h, 12h, 16h, 20h).
  const now = new Date()
  const FROID_HEURES = [8, 12, 16, 20]
  if (settings?.haccp_froid !== false) {
    for (const heure of FROID_HEURES) {
      const cible = new Date(now)
      cible.setHours(heure - 1, 30, 0, 0) // rappel 30 min avant
      const delayMs = cible - now
      if (delayMs > 0) {
        notify(
          '🌡️ Relevé froid dans 30 min',
          `Pensez à effectuer votre relevé de température froid avant ${heure}h00.`,
          delayMs
        )
      }
    }
  }

  // ── Chaud : rappel avant le service du midi (11h30) et du soir (18h30)
  if (settings?.haccp_chaud !== false) {
    const services = [{ h: 11, m: 30 }, { h: 18, m: 30 }]
    for (const { h, m } of services) {
      const cible = new Date(now)
      cible.setHours(h, m, 0, 0)
      const delayMs = cible - now
      if (delayMs > 0) {
        notify(
          '🔴 Relevé chaud à effectuer',
          `Avant le service, enregistrez la température de vos préparations chaudes.`,
          delayMs
        )
      }
    }
  }

  return () => timers.forEach(clearTimeout)
}
