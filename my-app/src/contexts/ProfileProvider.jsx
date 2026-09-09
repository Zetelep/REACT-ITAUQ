import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useAuth } from './AuthProvider'
import { api } from '../lib/apiClient'

const ProfileContext = createContext(null)

export function ProfileProvider({ children }) {
  const { session } = useAuth()
  const [profile, setProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(true)

  const fetchProfile = useCallback(async () => {
    try {
      const data = await api.get('/profiles/me')
      setProfile(data)
      return data
    } catch (err) {
      console.error('Failed to fetch profile:', err)
      setProfile(null)
      return null
    }
  }, [])

  useEffect(() => {
    let mounted = true

    if (!session?.access_token) {
      setProfile(null)
      setProfileLoading(false)
      return
    }

    setProfileLoading(true)
    fetchProfile().finally(() => {
      if (mounted) setProfileLoading(false)
    })

    return () => { mounted = false }
  }, [session?.access_token, fetchProfile])

  const refreshProfile = useCallback(async () => {
    return fetchProfile()
  }, [fetchProfile])

  const updateProfile = useCallback(async (data) => {
    const updated = await api.patch('/profiles/me', data)
    setProfile(updated)
    return updated
  }, [])

  return (
    <ProfileContext.Provider value={{ profile, profileLoading, refreshProfile, updateProfile }}>
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile() {
  return useContext(ProfileContext)
}
