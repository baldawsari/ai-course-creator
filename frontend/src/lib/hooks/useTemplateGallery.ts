import { useState, useCallback, useMemo } from 'react'

export interface Template {
  id: string
  name: string
  category: string
  description: string
  preview: string
  rating: number
  exports: number
  isFavorite: boolean
  isRecent: boolean
  features: string[]
  colors: string[]
  tags: string[]
}

export interface TemplateGalleryState {
  templates: Template[]
  favorites: string[]
  recentlyUsed: string[]
  searchQuery: string
  activeCategory: string
  sortBy: 'rating' | 'exports' | 'name' | 'recent'
  sortOrder: 'asc' | 'desc'
}

export function useTemplateGallery(initialTemplates: Template[]) {
  const [state, setState] = useState<TemplateGalleryState>({
    templates: initialTemplates,
    favorites: [],
    recentlyUsed: [],
    searchQuery: '',
    activeCategory: 'all',
    sortBy: 'rating',
    sortOrder: 'desc'
  })

  // Filtered and sorted templates
  const filteredTemplates = useMemo(() => {
    let filtered = state.templates

    // Filter by category
    if (state.activeCategory !== 'all') {
      filtered = filtered.filter(template => template.category === state.activeCategory)
    }

    // Filter by search query
    if (state.searchQuery) {
      const query = state.searchQuery.toLowerCase()
      filtered = filtered.filter(template => 
        template.name.toLowerCase().includes(query) ||
        template.description.toLowerCase().includes(query) ||
        template.tags.some(tag => tag.toLowerCase().includes(query)) ||
        template.features.some(feature => feature.toLowerCase().includes(query))
      )
    }

    // Sort templates
    filtered.sort((a, b) => {
      let comparison = 0
      
      switch (state.sortBy) {
        case 'rating':
          comparison = a.rating - b.rating
          break
        case 'exports':
          comparison = a.exports - b.exports
          break
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'recent':
          const aRecent = state.recentlyUsed.indexOf(a.id)
          const bRecent = state.recentlyUsed.indexOf(b.id)
          if (aRecent === -1 && bRecent === -1) comparison = 0
          else if (aRecent === -1) comparison = 1
          else if (bRecent === -1) comparison = -1
          else comparison = aRecent - bRecent
          break
      }

      return state.sortOrder === 'asc' ? comparison : -comparison
    })

    return filtered
  }, [state.templates, state.activeCategory, state.searchQuery, state.sortBy, state.sortOrder, state.recentlyUsed])

  // Actions
  const setSearchQuery = useCallback((query: string) => {
    setState(prev => ({ ...prev, searchQuery: query }))
  }, [])

  const setActiveCategory = useCallback((category: string) => {
    setState(prev => ({ ...prev, activeCategory: category }))
  }, [])

  const setSorting = useCallback((sortBy: TemplateGalleryState['sortBy'], sortOrder: TemplateGalleryState['sortOrder']) => {
    setState(prev => ({ ...prev, sortBy, sortOrder }))
  }, [])

  const toggleFavorite = useCallback((templateId: string) => {
    setState(prev => {
      const favorites = prev.favorites.includes(templateId)
        ? prev.favorites.filter(id => id !== templateId)
        : [...prev.favorites, templateId]
      
      const templates = prev.templates.map(template => 
        template.id === templateId 
          ? { ...template, isFavorite: favorites.includes(templateId) }
          : template
      )

      return { ...prev, favorites, templates }
    })
  }, [])

  const markAsUsed = useCallback((templateId: string) => {
    setState(prev => {
      const recentlyUsed = [templateId, ...prev.recentlyUsed.filter(id => id !== templateId)].slice(0, 10)
      
      const templates = prev.templates.map(template => 
        template.id === templateId 
          ? { ...template, isRecent: recentlyUsed.slice(0, 5).includes(templateId) }
          : { ...template, isRecent: recentlyUsed.slice(0, 5).includes(template.id) }
      )

      return { ...prev, recentlyUsed, templates }
    })
  }, [])

  const getTemplateById = useCallback((id: string) => {
    return state.templates.find(template => template.id === id) || null
  }, [state.templates])

  const getTemplatesByCategory = useCallback((category: string) => {
    return state.templates.filter(template => template.category === category)
  }, [state.templates])

  const getFavoriteTemplates = useCallback(() => {
    return state.templates.filter(template => state.favorites.includes(template.id))
  }, [state.templates, state.favorites])

  const getRecentTemplates = useCallback(() => {
    return state.recentlyUsed
      .map(id => state.templates.find(template => template.id === id))
      .filter(Boolean) as Template[]
  }, [state.templates, state.recentlyUsed])

  const getPopularTemplates = useCallback(() => {
    return [...state.templates]
      .sort((a, b) => b.exports - a.exports)
      .slice(0, 6)
  }, [state.templates])

  const getTemplateStats = useCallback(() => {
    const totalTemplates = state.templates.length
    const favoriteCount = state.favorites.length
    const recentCount = state.recentlyUsed.length
    const avgRating = state.templates.reduce((sum, t) => sum + t.rating, 0) / totalTemplates
    
    const categoryCounts = state.templates.reduce((acc, template) => {
      acc[template.category] = (acc[template.category] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      totalTemplates,
      favoriteCount,
      recentCount,
      avgRating: Math.round(avgRating * 10) / 10,
      categoryCounts
    }
  }, [state.templates, state.favorites, state.recentlyUsed])

  return {
    // State
    templates: filteredTemplates,
    allTemplates: state.templates,
    searchQuery: state.searchQuery,
    activeCategory: state.activeCategory,
    sortBy: state.sortBy,
    sortOrder: state.sortOrder,
    favorites: state.favorites,
    recentlyUsed: state.recentlyUsed,

    // Actions
    setSearchQuery,
    setActiveCategory,
    setSorting,
    toggleFavorite,
    markAsUsed,

    // Getters
    getTemplateById,
    getTemplatesByCategory,
    getFavoriteTemplates,
    getRecentTemplates,
    getPopularTemplates,
    getTemplateStats
  }
}