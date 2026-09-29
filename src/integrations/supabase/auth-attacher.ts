// Attache le jeton Supabase de la session du navigateur aux appels de
// fonctions serveur. Généré pour l'intégration TanStack Start + Supabase.
import { createMiddleware } from '@tanstack/react-start'

import { supabase } from './client'

export const attachSupabaseAuth = createMiddleware({ type: 'function' }).client(
  async ({ next }) => {
    if (typeof window === 'undefined') {
      return next({ context: { headers: new Headers() } })
    }

    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token

    const headers = new Headers()
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }

    return next({ context: { headers } })
  },
)
