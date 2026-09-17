function numeroCoordinata(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  const numero =
    typeof value === "string" ? Number(value.trim().replace(",", ".")) : value;
  return Number.isFinite(numero) ? numero : null;
}

export function creaUrlGoogleMaps(
  latitudine: number | string | null | undefined,
  longitudine: number | string | null | undefined
) {
  const lat = numeroCoordinata(latitudine);
  const lng = numeroCoordinata(longitudine);

  if (
    lat === null ||
    lng === null ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return null;
  }

  const url = new URL("https://www.google.com/maps/search/");
  url.searchParams.set("api", "1");
  url.searchParams.set("query", `${lat},${lng}`);
  return url.toString();
}
