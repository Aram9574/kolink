import { useEffect } from "react";
import { useRouter } from "next/router";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redirige al dashboard si el usuario está autenticado,
    // o al login si no.
    const token = localStorage.getItem("supabase.auth.token");
    router.push(token ? "/dashboard" : "/signin");
  }, [router]); // ✅ se incluye router como dependencia

  return (
    <main style={{ textAlign: "center", marginTop: "30vh" }}>
      <h1>Cargando tu espacio en KOLINK...</h1>
    </main>
  );
}
