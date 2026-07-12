'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getGreeting } from '@/lib/utils'

export default function AppHeader() {
  const [shopName, setShopName] = useState('')

  useEffect(() => {
    const load = async () => {
      const user = (await supabase.auth.getUser()).data.user
      if (!user) return
      const { data } = await supabase
        .from('profiles')
        .select('shop_name')
        .eq('id', user.id)
        .single()
      if (data?.shop_name) setShopName(data.shop_name)
    }
    load()
  }, [])

  return (
    <div className="header">
      <h1 className="header-mobile-title">DawrBa<span className="dot"></span></h1>
      <div className="header-right">
        <span className="header-greeting">{getGreeting()}</span>
        {shopName && <span className="header-shop-label">{shopName}</span>}
      </div>
    </div>
  )
}
