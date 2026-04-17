import dayjs from "dayjs";

const DOW_ES = {
  MO: "lunes",
  TU: "martes",
  WE: "miércoles",
  TH: "jueves",
  FR: "viernes",
  SA: "sábado",
  SU: "domingo",
};

const DOW_ES_SHORT = {
  MO: "L",
  TU: "M",
  WE: "X",
  TH: "J",
  FR: "V",
  SA: "S",
  SU: "D",
};

// *** CLAVE: allDay en LOCAL NAIVE (sin Z) ***
const asLocalNaive = (d) => dayjs(d).second(0).millisecond(0).format("YYYY-MM-DDTHH:mm:ss");

export const normalizeAllDayRange = (dateD) => {
  const base = dayjs(dateD).startOf("day");

  const start = base.hour(0).minute(0).second(0).millisecond(0);
  const end = base.hour(23).minute(0).second(0).millisecond(0);

  return {
    start: asLocalNaive(start),
    end: asLocalNaive(end),
  };
};


const joinWithCommasAndY = (arr) => {
  if (!arr || arr.length === 0) return "";
  if (arr.length === 1) return arr[0];
  if (arr.length === 2) return `${arr[0]} y ${arr[1]}`;
  return `${arr.slice(0, -1).join(", ")} y ${arr[arr.length - 1]}`;
};

export const buildRecurrenceTextES = (r) => {
  if (!r) return "";

  const interval = Number(r.interval || 1);
  const untilTxt = r.until ? ` hasta ${dayjs(r.until).format("DD MMM YYYY")}` : "";

  if (r.freq === "DAILY") {
    if (interval === 1) return `Se produce todos los días${untilTxt}`;
    return `Se produce cada ${interval} días${untilTxt}`;
  }

  if (r.freq === "WEEKLY") {
    const days = (r.byweekday || []).map((d) => DOW_ES[d]).filter(Boolean);
    const daysTxt = days.length ? ` (${joinWithCommasAndY(days)})` : "";
    if (interval === 1) return `Se produce cada semana${daysTxt}${untilTxt}`;
    return `Se produce cada ${interval} semanas${daysTxt}${untilTxt}`;
  }

  if (r.freq === "MONTHLY") {
    if (r.mode === "BYSETPOS") {
      const pos =
        r.bysetpos === 1
          ? "primer"
          : r.bysetpos === 2
          ? "segundo"
          : r.bysetpos === 3
          ? "tercer"
          : r.bysetpos === 4
          ? "cuarto"
          : "último";
      const dow = DOW_ES[r.byweekday?.[0]] || "";
      const md = dow ? `${pos} ${dow}` : `${pos} día`;
      if (interval === 1) return `Se produce el ${md} de cada mes${untilTxt}`;
      return `Se produce el ${md} cada ${interval} meses${untilTxt}`;
    }

    const md = Number(r.bymonthday || 1);
    if (interval === 1) return `Se produce el día ${md} de cada mes${untilTxt}`;
    return `Se produce el día ${md} cada ${interval} meses${untilTxt}`;
  }

  if (r.freq === "YEARLY") {
    if (r.mode === "BYSETPOS") {
      const pos =
        r.bysetpos === 1
          ? "primer"
          : r.bysetpos === 2
          ? "segundo"
          : r.bysetpos === 3
          ? "tercer"
          : r.bysetpos === 4
          ? "cuarto"
          : "último";
      const dow = DOW_ES[r.byweekday?.[0]] || "";
      const monthName = r.bymonth ? dayjs().month(r.bymonth - 1).format("MMMM") : "";
      const md = dow ? `${pos} ${dow} de ${monthName}` : `${pos} día de ${monthName}`;
      return `Se produce el ${md}${untilTxt || ""}`;
    }

    const monthName = r.bymonth ? dayjs().month(r.bymonth - 1).format("MMMM") : "";
    const md = Number(r.bymonthday || 1);
    return `Se produce el ${md} de ${monthName}${untilTxt || ""}`;
  }

  return "";
};

export const DOW_SHORT = DOW_ES_SHORT;
export const DOW_LONG = DOW_ES;
