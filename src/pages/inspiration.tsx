"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import type { Session } from "@supabase/supabase-js";
import Navbar from "@/components/Navbar";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Loader from "@/components/Loader";
import { supabase } from "@/lib/supabase";
import {
  Search,
  Bookmark,
  Save,
  Trash2,
  Play,
  SlidersHorizontal,
  Sparkles,
  Lightbulb,
  Brain,
  Megaphone,
  Image as ImageIcon,
  Video,
  FileText,
  LayoutGrid,
  List,
  Clock,
  Undo2,
  Filter,
  ArrowUpDown,
  Hash,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

type InspirationPost = {
  id: string;
  platform: string;
  author: string;
  author_url?: string;
  author_profile_image?: string;
  title?: string;
  content: string;
  summary?: string;
  tags: string[];
  metrics: {
    likes?: number;
    shares?: number;
    comments?: number;
    views?: number;
  };
  capturedAt: string;
  similarity?: number;
  original_url?: string;
  language?: string;
  country?: string;
  sector?: string;
};

type SavedSearchFilters = {
  query?: string;
  platform?: string;
  tags?: string[];
  contentTypes?: string[];
  format?: string;
  minLikes?: number;
  period?: string;
  hashtags?: string[];
  language?: string;
  sector?: string;
  country?: string;
};

type SavedSearch = {
  id: string;
  user_id: string;
  name: string;
  filters: SavedSearchFilters;
  created_at: string;
  updated_at: string;
};

type RuntimeFilters = {
  platform?: string;
  contentTypes?: string[];
  format?: string;
  minLikes?: number;
  period?: string;
  hashtags?: string[];
  sort?: "recent" | "top";
  language?: string;
  sector?: string;
  country?: string;
};

const defaultMinLikes = 0;
const maxLikesValue = 90000;

const contentTypeOptions = [
  { id: "instructivo", label: "Instructivo", icon: Lightbulb },
  { id: "inspirador", label: "Inspirador", icon: Sparkles },
  { id: "introspectivo", label: "Introspectivo", icon: Brain },
  { id: "promocional", label: "Promocional", icon: Megaphone },
];

const formatOptions = [
  { id: "imagen", label: "Imagen", icon: ImageIcon },
  { id: "video", label: "Vídeo", icon: Video },
  { id: "carrusel", label: "Carrusel", icon: LayoutGrid },
  { id: "texto", label: "Texto", icon: FileText },
];

const periodOptions = [
  { id: "30d", label: "30D" },
  { id: "3m", label: "3M" },
  { id: "12m", label: "12M" },
];

const platformOptions = [
  { id: "", label: "Todas las plataformas" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "twitter", label: "Twitter/X" },
  { id: "instagram", label: "Instagram" },
];

const languageOptions = [
  { id: "", label: "Todos los idiomas" },
  { id: "es", label: "Español" },
  { id: "en", label: "English" },
  { id: "fr", label: "Français" },
  { id: "de", label: "Deutsch" },
  { id: "it", label: "Italiano" },
  { id: "pt", label: "Português" },
];

const sectorOptions = [
  { id: "", label: "Todos los sectores" },
  { id: "tech", label: "Tecnología" },
  { id: "marketing", label: "Marketing" },
  { id: "sales", label: "Ventas" },
  { id: "leadership", label: "Liderazgo" },
  { id: "productivity", label: "Productividad" },
  { id: "entrepreneurship", label: "Emprendimiento" },
  { id: "finance", label: "Finanzas" },
  { id: "health", label: "Salud" },
  { id: "education", label: "Educación" },
];

const countryOptions = [
  { id: "", label: "Todos los países" },
  { id: "US", label: "Estados Unidos" },
  { id: "ES", label: "España" },
  { id: "MX", label: "México" },
  { id: "AR", label: "Argentina" },
  { id: "CO", label: "Colombia" },
  { id: "CL", label: "Chile" },
  { id: "PE", label: "Perú" },
  { id: "GB", label: "Reino Unido" },
  { id: "FR", label: "Francia" },
  { id: "DE", label: "Alemania" },
];

const sanitizeHashtagsArray = (hashtags?: string[]) =>
  (hashtags ?? [])
    .map((tag) => tag.replace(/^#/, "").trim())
    .filter(Boolean);

const normalizeHashtagsInput = (input: string) =>
  input
    .split(/[,\s]+/)
    .map((tag) => tag.replace(/^#/, "").trim())
    .filter(Boolean);

const getOptionLabel = (options: Array<{ id: string; label: string }>, value: string) =>
  options.find((option) => option.id === value)?.label ?? value;

const hasFilterValues = (filters: SavedSearchFilters) =>
  Object.values(filters).some((value) => {
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    return value !== undefined && value !== "" && value !== null;
  });

const renderFilterSummary = (filters: SavedSearchFilters) => {
  const chips: string[] = [];
  if (filters.platform) chips.push(filters.platform);
  if (filters.contentTypes?.length) chips.push(filters.contentTypes.join(", "));
  if (filters.format) chips.push(filters.format);
  if (filters.minLikes) chips.push(`+${filters.minLikes} likes`);
  if (filters.period) chips.push(filters.period.toUpperCase());
  if (filters.hashtags?.length) {
    const formatted = filters.hashtags.map((tag) => `#${tag.replace(/^#/, "")}`);
    const [first, ...rest] = formatted;
    chips.push(rest.length ? `${first} +${rest.length}` : first);
  }
  if (filters.language) {
    chips.push(`Idioma: ${getOptionLabel(languageOptions, filters.language)}`);
  }
  if (filters.sector) {
    chips.push(`Sector: ${getOptionLabel(sectorOptions, filters.sector)}`);
  }
  if (filters.country) {
    chips.push(`País: ${getOptionLabel(countryOptions, filters.country)}`);
  }
  return chips.length > 0 ? chips.join(" • ") : "Sin filtros adicionales";
};

export default function InspirationPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState("");
  const [selectedContentTypes, setSelectedContentTypes] = useState<string[]>([]);
  const [selectedFormat, setSelectedFormat] = useState("");
  const [minLikes, setMinLikes] = useState(defaultMinLikes);
  const [timeRange, setTimeRange] = useState("");
  const [hashtagsInput, setHashtagsInput] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [selectedSector, setSelectedSector] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [results, setResults] = useState<InspirationPost[]>([]);
  const [resultsCount, setResultsCount] = useState(0);
  const [sortOption, setSortOption] = useState<"recent" | "top">("recent");
  const [searching, setSearching] = useState(false);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newSearchName, setNewSearchName] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      if (!currentSession) {
        router.push("/signin");
        return;
      }
      setLoading(false);
      performSearch("", undefined, currentSession);
      loadSavedSearches(currentSession);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, updatedSession) => {
      setSession(updatedSession);
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hashtagPreview = useMemo(() => normalizeHashtagsInput(hashtagsInput), [hashtagsInput]);

  const hasActiveFilters = useMemo(() => {
    return (
      selectedPlatform ||
      selectedContentTypes.length > 0 ||
      selectedFormat ||
      minLikes !== defaultMinLikes ||
      timeRange ||
      hashtagPreview.length > 0 ||
      selectedLanguage ||
      selectedSector ||
      selectedCountry
    );
  }, [
    selectedPlatform,
    selectedContentTypes,
    selectedFormat,
    minLikes,
    timeRange,
    hashtagPreview,
    selectedLanguage,
    selectedSector,
    selectedCountry,
  ]);

  const performSearch = async (
    query: string,
    overrides?: RuntimeFilters,
    activeSession: Session | null = session
  ) => {
    if (!activeSession) return;

    setSearching(true);
    try {
      const token = activeSession.access_token;
      const hashtags = overrides?.hashtags
        ? sanitizeHashtagsArray(overrides.hashtags)
        : hashtagPreview;

      const platform = overrides?.platform ?? selectedPlatform;
      const contentTypes = overrides?.contentTypes ?? selectedContentTypes;
      const format = overrides?.format ?? selectedFormat;
      const likeFloor = overrides?.minLikes ?? minLikes;
      const period = overrides?.period ?? timeRange;
      const sort = overrides?.sort ?? sortOption;
      const language = overrides?.language ?? selectedLanguage;
      const sector = overrides?.sector ?? selectedSector;
      const country = overrides?.country ?? selectedCountry;

      const filtersPayload: Record<string, unknown> = {};
      if (platform) filtersPayload.platform = platform;
      if (contentTypes.length) filtersPayload.contentTypes = contentTypes;
      if (format) filtersPayload.format = format;
      if (likeFloor > 0) filtersPayload.minLikes = likeFloor;
      if (period) filtersPayload.period = period;
      if (hashtags.length) filtersPayload.hashtags = hashtags;
      if (language) filtersPayload.language = language;
      if (sector) filtersPayload.sector = sector;
      if (country) filtersPayload.country = country;

      const payload = {
        query: query || undefined,
        filters: Object.keys(filtersPayload).length ? filtersPayload : undefined,
        limit: 24,
        sort,
      };

      const response = await fetch("/api/inspiration/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.ok) {
        setResults(data.results || []);
        setResultsCount(data.results?.length ?? 0);
      } else {
        toast.error(data.error || "Error al buscar inspiración");
      }
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Error de conexión");
    } finally {
      setSearching(false);
    }
  };

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    performSearch(searchQuery);
  };

  const toggleContentType = (value: string) => {
    setSelectedContentTypes((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]
    );
  };

  const handleFormatSelect = (value: string) => {
    setSelectedFormat((prev) => (prev === value ? "" : value));
  };

  const handlePeriodSelect = (value: string) => {
    setTimeRange((prev) => (prev === value ? "" : value));
  };

  const handleFiltersApply = () => {
    performSearch(searchQuery);
  };

  const handleResetFilters = () => {
    setSelectedPlatform("");
    setSelectedContentTypes([]);
    setSelectedFormat("");
    setMinLikes(defaultMinLikes);
    setTimeRange("");
    setHashtagsInput("");
    setSelectedLanguage("");
    setSelectedSector("");
    setSelectedCountry("");
    performSearch(searchQuery, {
      platform: "",
      contentTypes: [],
      format: "",
      minLikes: defaultMinLikes,
      period: "",
      hashtags: [],
      language: "",
      sector: "",
      country: "",
    });
  };

  const handleSortChange = (value: "recent" | "top") => {
    setSortOption(value);
    performSearch(searchQuery, { sort: value });
  };

  const savePost = async (postId: string) => {
    if (!session) return;

    try {
      const token = session.access_token;
      const response = await fetch("/api/inspiration/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ type: "post", inspirationPostId: postId }),
      });

      const data = await response.json();

      if (data.ok) {
        toast.success("Post guardado en favoritos");
      } else {
        toast.error(data.error || "Error al guardar");
      }
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Error al guardar");
    }
  };

  const loadSavedSearches = async (activeSession: Session) => {
    try {
      const token = activeSession.access_token;
      const response = await fetch("/api/inspiration/searches/list", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.ok) {
        const rawSearches = Array.isArray(data.searches) ? data.searches : [];
        const sanitized: SavedSearch[] = rawSearches.map((search: unknown) => {
          const typed = search as SavedSearch;
          return {
            ...typed,
            filters: typed.filters ?? {},
          };
        });
        setSavedSearches(sanitized);
      }
    } catch (error) {
      console.error("Load searches error:", error);
    }
  };

  const handleSaveCurrentSearch = async () => {
    if (!session || !newSearchName.trim()) {
      toast.error("Por favor ingresa un nombre para la búsqueda");
      return;
    }

    const hashtags = hashtagPreview;
    const filtersToSave: SavedSearchFilters = {
      query: searchQuery || undefined,
      platform: selectedPlatform || undefined,
      contentTypes: selectedContentTypes.length ? selectedContentTypes : undefined,
      format: selectedFormat || undefined,
      minLikes: minLikes !== defaultMinLikes ? minLikes : undefined,
      period: timeRange || undefined,
      hashtags: hashtags.length ? hashtags : undefined,
      language: selectedLanguage || undefined,
      sector: selectedSector || undefined,
      country: selectedCountry || undefined,
    };

    if (!searchQuery && !hasFilterValues(filtersToSave)) {
      toast.error("Agrega un término o filtro antes de guardar");
      return;
    }

    try {
      const token = session.access_token;
      const response = await fetch("/api/inspiration/searches/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newSearchName.trim(),
          filters: filtersToSave,
        }),
      });

      const data = await response.json();
      if (data.ok) {
        toast.success("Búsqueda guardada");
        setSavedSearches([data.search, ...savedSearches]);
        setShowSaveDialog(false);
        setNewSearchName("");
      } else {
        toast.error(data.error || "Error al guardar búsqueda");
      }
    } catch (error) {
      console.error("Save search error:", error);
      toast.error("Error al guardar búsqueda");
    }
  };

  const handleApplySavedSearch = (search: SavedSearch) => {
    setSearchQuery(search.filters.query || "");
    setSelectedPlatform(search.filters.platform || "");
    setSelectedContentTypes(search.filters.contentTypes || []);
    setSelectedFormat(search.filters.format || "");
    setMinLikes(search.filters.minLikes ?? defaultMinLikes);
    setTimeRange(search.filters.period || "");
    setSelectedLanguage(search.filters.language || "");
    setSelectedSector(search.filters.sector || "");
    setSelectedCountry(search.filters.country || "");

    const savedHashtags = sanitizeHashtagsArray(search.filters.hashtags);
    setHashtagsInput(
      savedHashtags.length ? savedHashtags.map((tag) => `#${tag}`).join(", ") : ""
    );

    performSearch(search.filters.query || "", {
      platform: search.filters.platform,
      contentTypes: search.filters.contentTypes,
      format: search.filters.format,
      minLikes: search.filters.minLikes ?? defaultMinLikes,
      period: search.filters.period,
      hashtags: savedHashtags,
      language: search.filters.language ?? "",
      sector: search.filters.sector ?? "",
      country: search.filters.country ?? "",
    });

    toast.success(`Aplicando búsqueda: ${search.name}`);
  };

  const handleDeleteSavedSearch = async (searchId: string) => {
    if (!session) return;

    try {
      const token = session.access_token;
      const response = await fetch(`/api/inspiration/searches/delete?searchId=${searchId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.ok) {
        toast.success("Búsqueda eliminada");
        setSavedSearches(savedSearches.filter((s) => s.id !== searchId));
      } else {
        toast.error(data.error || "Error al eliminar");
      }
    } catch (error) {
      console.error("Delete search error:", error);
      toast.error("Error al eliminar");
    }
  };

  const handleUseIdea = (post: InspirationPost) => {
    try {
      const ideaContent = (post.summary || post.content || "").trim();
      if (!ideaContent) {
        toast.error("No pudimos preparar esta idea. Intenta con otra.");
        return;
      }
      localStorage.setItem("kolink-draft", ideaContent);
      toast.success("Idea enviada a tu editor. Redirigiendo al estudio creativo...");
      router.push("/dashboard");
    } catch (error) {
      console.error("Use idea error:", error);
      toast.error("No se pudo enviar la idea al editor");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-950">
        <Loader />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navbar session={session} />

      <main className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:pl-64">
        <div className="flex flex-col gap-6 lg:flex-row">
          <section className="flex-1 space-y-6">
            <header className="space-y-3">
              <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-widest text-primary">
                <Sparkles className="h-4 w-4" />
                Modo comunidad
              </div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white md:text-4xl">
                Inspiration Hub
              </h1>
              <p className="text-base text-slate-600 dark:text-slate-300 md:text-lg">
                Observa lo que comparte tu comunidad y construye tu próximo contenido con datos reales.
              </p>
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Listo para conectar con el feed de LinkedIn
                </div>
                <div className="flex items-center gap-1">
                  <Search className="h-4 w-4" />
                  {searching ? "Buscando ideas..." : `${resultsCount} resultados disponibles`}
                </div>
                {hasActiveFilters && (
                  <div className="flex items-center gap-1">
                    <Filter className="h-4 w-4" />
                    Filtros activos
                  </div>
                )}
              </div>
            </header>

            <Card className="p-6">
              <form onSubmit={handleSearch} className="space-y-5">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Buscar por palabra clave, persona o tema…"
                      className="w-full rounded-xl border border-slate-200 bg-white px-10 py-4 text-base text-slate-900 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={searching}
                    className="min-h-[52px] w-full sm:w-auto"
                  >
                    {searching ? "Buscando..." : "Buscar inspiración"}
                  </Button>
                </div>

                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-3">
                    <Filter className="h-5 w-5 text-slate-400" />
                    <select
                      value={selectedPlatform}
                      onChange={(event) => setSelectedPlatform(event.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 md:w-60"
                    >
                      {platformOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-3">
                    <ArrowUpDown className="h-4 w-4 text-slate-400" />
                    <select
                      value={sortOption}
                      onChange={(event) =>
                        handleSortChange(event.target.value as "recent" | "top")
                      }
                      className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    >
                      <option value="recent">Ordenar por fecha</option>
                      <option value="top">Ordenar por relevancia</option>
                    </select>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowSaveDialog(true)}
                      className="flex items-center gap-2"
                    >
                      <Save className="h-4 w-4" />
                      Guardar búsqueda
                    </Button>
                  </div>
                </div>
              </form>
            </Card>

            {savedSearches.length > 0 && (
              <Card className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                    Búsquedas guardadas
                  </h2>
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {savedSearches.length} presets
                  </span>
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {savedSearches.map((search) => (
                    <div
                      key={search.id}
                      className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-primary hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
                    >
                      <div className="min-w-0 space-y-1">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                          {search.name}
                        </p>
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                          {search.filters.query || "Sin palabra clave"}
                        </p>
                        <p className="truncate text-xs text-slate-400 dark:text-slate-500">
                          {renderFilterSummary(search.filters)}
                        </p>
                      </div>
                      <div className="ml-3 flex shrink-0 items-center gap-2">
                        <button
                          onClick={() => handleApplySavedSearch(search)}
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary/40 text-primary transition hover:bg-primary/10"
                          title="Aplicar búsqueda"
                        >
                          <Play className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteSavedSearch(search.id)}
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-500 transition hover:bg-red-50 dark:border-red-900/40 dark:hover:bg-red-900/20"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {showSaveDialog && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
                <Card className="w-full max-w-md p-6 shadow-2xl">
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                    Guardar búsqueda actual
                  </h3>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    Guarda este preset de filtros para reutilizarlo cuando tengas el feed de LinkedIn conectado.
                  </p>

                  <div className="mt-6 space-y-4">
                    <div>
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        Nombre
                      </label>
                      <input
                        type="text"
                        value={newSearchName}
                        onChange={(event) => setNewSearchName(event.target.value)}
                        placeholder="Ej: Agentes IA · +500 likes"
                        className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                    <div className="rounded-lg bg-slate-100/70 p-3 text-xs text-slate-600 dark:bg-slate-800/80 dark:text-slate-300">
                      <p>
                        <strong>Palabra clave:</strong> {searchQuery || "—"}
                      </p>
                      <p>
                        <strong>Plataforma:</strong> {selectedPlatform || "Todas"}
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <Button
                        onClick={handleSaveCurrentSearch}
                        className="flex-1"
                        disabled={searching}
                      >
                        Guardar
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowSaveDialog(false);
                          setNewSearchName("");
                        }}
                        className="flex-1"
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-6 py-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 md:flex-row md:items-center md:justify-between">
              <div className="text-sm text-slate-500 dark:text-slate-300">
                {searching
                  ? "Buscando ideas relevantes…"
                  : resultsCount === 1
                  ? "1 idea encontrada para tu búsqueda."
                  : `${resultsCount} ideas encontradas para tu búsqueda.`}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 dark:text-slate-500">Vista</span>
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition",
                    viewMode === "grid"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-slate-200 text-slate-500 hover:border-primary/40 hover:text-primary dark:border-slate-700 dark:text-slate-300"
                  )}
                >
                  <LayoutGrid className="h-4 w-4" />
                  Grid
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={cn(
                    "flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition",
                    viewMode === "list"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-slate-200 text-slate-500 hover:border-primary/40 hover:text-primary dark:border-slate-700 dark:text-slate-300"
                  )}
                >
                  <List className="h-4 w-4" />
                  Lista
                </button>
              </div>
            </div>

            {searching ? (
              <Card className="flex items-center justify-center py-16">
                <Loader />
              </Card>
            ) : results.length === 0 ? (
              <Card className="flex flex-col items-center justify-center gap-4 py-16 text-center">
                <Sparkles className="h-10 w-10 text-primary" />
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    Aún no tenemos ideas con estos filtros
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Ajusta la búsqueda o prueba con un nuevo tema para obtener resultados frescos de la comunidad.
                  </p>
                </div>
              </Card>
            ) : (
              <div
                className={cn(
                  viewMode === "grid"
                    ? "grid gap-6 sm:grid-cols-2 xl:grid-cols-3"
                    : "space-y-4"
                )}
              >
                {results.map((post) => {
                  const languageLabel = post.language
                    ? getOptionLabel(languageOptions, post.language)
                    : null;
                  const sectorLabel = post.sector
                    ? getOptionLabel(sectorOptions, post.sector)
                    : null;
                  const countryLabel = post.country
                    ? getOptionLabel(countryOptions, post.country)
                    : null;
                  const authorInitials = post.author
                    ? post.author
                        .split(" ")
                        .map((part) => part[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()
                    : "K";

                  return (
                    <Card
                      key={post.id}
                      className={cn(
                        "flex h-full flex-col overflow-hidden border border-slate-200 p-6 shadow-sm transition hover:shadow-md dark:border-slate-700",
                        viewMode === "list" && "md:flex-row md:items-start md:gap-6"
                      )}
                    >
                      <div className={cn("flex flex-col gap-4", viewMode === "list" && "md:w-64")}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <div
                              className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-xs font-semibold uppercase text-primary"
                              style={
                                post.author_profile_image
                                  ? {
                                      backgroundImage: `url(${post.author_profile_image})`,
                                      backgroundSize: "cover",
                                      backgroundPosition: "center",
                                    }
                                  : undefined
                              }
                            >
                              {!post.author_profile_image && authorInitials}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase text-primary">
                                  {post.platform}
                                </span>
                                {post.similarity && post.similarity > 0 && (
                                  <span className="text-xs text-slate-400">
                                    {(post.similarity * 100).toFixed(0)}% match
                                  </span>
                                )}
                              </div>
                              {post.author_url ? (
                                <a
                                  href={post.author_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-slate-800 transition hover:text-primary dark:text-slate-100"
                                >
                                  {post.author}
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                              ) : (
                                <p className="mt-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
                                  {post.author}
                                </p>
                              )}
                              <div className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                                <Clock className="h-3.5 w-3.5" />
                                {new Date(post.capturedAt).toLocaleDateString("es-ES", {
                                  day: "2-digit",
                                  month: "short",
                                })}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => savePost(post.id)}
                            className="rounded-full border border-slate-200 p-2 text-slate-400 transition hover:border-primary hover:text-primary dark:border-slate-700 dark:text-slate-500 dark:hover:border-primary dark:hover:text-primary"
                            title="Guardar en favoritos"
                          >
                            <Bookmark className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="space-y-3 text-xs text-slate-500 dark:text-slate-400">
                          {languageLabel && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                              Idioma: {languageLabel}
                            </span>
                          )}
                          {sectorLabel && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                              Sector: {sectorLabel}
                            </span>
                          )}
                          {countryLabel && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                              País: {countryLabel}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 flex flex-1 flex-col space-y-4 md:mt-0">
                        <div className="flex-1 space-y-3">
                          {post.title && (
                            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                              {post.title}
                            </h3>
                          )}
                          <p className="line-clamp-6 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                            {post.summary || post.content}
                          </p>

                          {post.tags?.length ? (
                            <div className="flex flex-wrap gap-2">
                              {post.tags.slice(0, 6).map((tag) => (
                                <span
                                  key={tag}
                                  className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                                >
                                  <Hash className="h-3 w-3" />
                                  {tag}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                          {post.metrics.likes && (
                            <span>{post.metrics.likes.toLocaleString()} likes</span>
                          )}
                          {post.metrics.shares && (
                            <span>{post.metrics.shares.toLocaleString()} shares</span>
                          )}
                          {post.metrics.comments && (
                            <span>{post.metrics.comments.toLocaleString()} comentarios</span>
                          )}
                          {post.metrics.views && (
                            <span>{post.metrics.views.toLocaleString()} visualizaciones</span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 pt-4">
                          <Button
                            type="button"
                            onClick={() => handleUseIdea(post)}
                            className="flex items-center gap-2"
                          >
                            Usar esta idea
                          </Button>
                          {post.original_url && (
                            <a
                              href={post.original_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-4 py-2 text-xs font-medium text-slate-500 transition hover:border-primary hover:text-primary dark:border-slate-700 dark:text-slate-300"
                            >
                              Ver original
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>

          <aside className="w-full shrink-0 space-y-6 lg:w-80">
            <Card className="p-6">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                  <SlidersHorizontal className="h-4 w-4 text-primary" />
                  Filtros activos
                </div>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className={cn(
                    "flex items-center gap-1 text-xs font-medium text-slate-400 transition hover:text-primary",
                    !hasActiveFilters && "pointer-events-none opacity-40"
                  )}
                >
                  <Undo2 className="h-3.5 w-3.5" />
                  Restablecer
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Plataforma
                  </p>
                  <select
                    value={selectedPlatform}
                    onChange={(event) => setSelectedPlatform(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    {platformOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Tipo de contenido
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {contentTypeOptions.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => toggleContentType(option.id)}
                        className={cn(
                          "flex flex-col items-start gap-1 rounded-lg border px-3 py-3 text-left text-sm transition",
                          selectedContentTypes.includes(option.id)
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-slate-200 text-slate-600 hover:border-primary/40 hover:text-primary dark:border-slate-700 dark:text-slate-300"
                        )}
                      >
                        <option.icon className="h-4 w-4" />
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Formato
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {formatOptions.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => handleFormatSelect(option.id)}
                        className={cn(
                          "flex items-center gap-2 rounded-lg border px-3 py-3 text-sm transition",
                          selectedFormat === option.id
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-slate-200 text-slate-600 hover:border-primary/40 hover:text-primary dark:border-slate-700 dark:text-slate-300"
                        )}
                      >
                        <option.icon className="h-4 w-4" />
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Me gusta mínimos
                    <span className="text-slate-600 dark:text-slate-300">
                      {minLikes.toLocaleString()}
                    </span>
                  </p>
                  <input
                    type="range"
                    min={0}
                    max={maxLikesValue}
                    step={50}
                    value={minLikes}
                    onChange={(event) => setMinLikes(Number(event.target.value))}
                    className="mt-3 w-full accent-primary"
                  />
                  <div className="mt-1 flex justify-between text-xs text-slate-400">
                    <span>0</span>
                    <span>{maxLikesValue.toLocaleString()}</span>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Periodo
                  </p>
                  <div className="mt-3 flex gap-2">
                    {periodOptions.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => handlePeriodSelect(option.id)}
                        className={cn(
                          "flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition",
                          timeRange === option.id
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-slate-200 text-slate-600 hover:border-primary/40 hover:text-primary dark:border-slate-700 dark:text-slate-300"
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Advanced Filters Section */}
                <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-4">
                    Filtros Avanzados
                  </p>

                  <div className="space-y-4">
                    {/* Language Filter */}
                    <div>
                      <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-2">
                        Idioma
                      </p>
                      <select
                        value={selectedLanguage}
                        onChange={(e) => setSelectedLanguage(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      >
                        {languageOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Sector Filter */}
                    <div>
                      <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-2">
                        Sector
                      </p>
                      <select
                        value={selectedSector}
                        onChange={(e) => setSelectedSector(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      >
                        {sectorOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Country Filter */}
                    <div>
                      <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-2">
                        País
                      </p>
                      <select
                        value={selectedCountry}
                        onChange={(e) => setSelectedCountry(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      >
                        {countryOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Hashtags
                  </p>
                  <input
                    type="text"
                    value={hashtagsInput}
                    onChange={(event) => setHashtagsInput(event.target.value)}
                    placeholder="#Growth #Liderazgo"
                    className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  />
                  {hashtagPreview.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {hashtagPreview.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-slate-200 px-2.5 py-1 text-xs text-slate-700 dark:bg-slate-700 dark:text-slate-200"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <Button
                  onClick={handleFiltersApply}
                  disabled={searching}
                  className="w-full min-h-[48px]"
                >
                  {searching ? "Actualizando..." : "Aplicar filtros"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleResetFilters}
                  className="w-full min-h-[44px]"
                  disabled={!hasActiveFilters}
                >
                  Limpiar filtros
                </Button>
              </div>
            </Card>

            <Card className="border-2 border-dashed border-primary/40 bg-primary/5 p-6">
              <h3 className="text-base font-semibold text-primary">
                Próximamente: Conecta tu LinkedIn
              </h3>
              <p className="mt-2 text-sm text-primary/80">
                Esta vista está lista para sincronizarse con la API oficial de LinkedIn. Cuando esté disponible, podrás filtrar en tiempo real el contenido que publica tu comunidad y detectar oportunidades al instante.
              </p>
              <Button
                type="button"
                variant="outline"
                disabled
                className="mt-4 w-full border-primary text-primary opacity-60"
              >
                Conectar LinkedIn (muy pronto)
              </Button>
            </Card>
          </aside>
        </div>
      </main>
    </div>
  );
}
