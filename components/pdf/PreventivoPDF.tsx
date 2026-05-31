import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

Font.registerHyphenationCallback((word) => [word]);

const MACROCATEGORIE = [
  "Progettazione",
  "Realizzazione",
  "Chiusura dei lavori",
];

const BLUE = "#071E63";
const GREEN = "#4CAF50";
const LIGHT = "#F3F5FA";

const styles = StyleSheet.create({
  cover: {
    padding: 0,
    margin: 0,
    backgroundColor: "#FFFFFF",
  },

  coverCanvas: {
    position: "relative",
    width: 595.28,
    height: 841.89,
  },

  coverBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 595.28,
    height: 841.89,
  },

  coverLogoImage: {
    position: "absolute",
    top: -50,
    left: -315,
    width: 1040,
    height: 312,
    objectFit: "contain",
  },

  coverBadgesBox: {
    position: "absolute",
    top: 28,
    right: 35,
    width: 105,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    border: "1 solid #E2E4EA",
    alignItems: "center",
  },

  coverBadge: {
    width: 60,
    height: 35,
    objectFit: "contain",
    marginBottom: 8,
    alignSelf: "center",
  },

  coverTitle: {
    position: "absolute",
    top: 235,
    left: 62,
    fontSize: 31,
    fontWeight: "bold",
    color: BLUE,
  },

  coverNumber: {
    position: "absolute",
    top: 272,
    left: 62,
    fontSize: 28,
    fontWeight: "bold",
    color: GREEN,
  },

  coverDate: {
    position: "absolute",
    top: 315,
    left: 62,
    fontSize: 13,
    color: BLUE,
  },

  coverGreenLine: {
    position: "absolute",
    top: 352,
    left: 62,
    width: 38,
    height: 5,
    backgroundColor: GREEN,
    borderRadius: 4,
  },

  coverBlueLine: {
    position: "absolute",
    top: 354,
    left: 106,
    width: 28,
    height: 2,
    backgroundColor: BLUE,
  },

  coverInfoRow: {
    position: "absolute",
    left: 60,
    flexDirection: "row",
    alignItems: "flex-start",
  },

  coverIconCircle: {
  width: 34,
  height: 34,
  marginRight: 14,
  alignItems: "center",
  justifyContent: "center",
},

  coverIcon: {
    width: 34,
    height: 34,
    objectFit: "contain",
  },

  coverInfoContent: {
    width: 225,
  },

  coverInfoLabel: {
    fontSize: 8,
    fontWeight: "bold",
    color: BLUE,
    marginBottom: 5,
  },

  coverInfoValue: {
    fontSize: 11,
    fontWeight: "bold",
    color: BLUE,
    marginBottom: 2,
    lineHeight: 1.3,
  },

  coverInfoText: {
    fontSize: 9,
    color: "GREEN",
    lineHeight: 1.2,
  },

  coverFooterCol1: {
    position: "absolute",
    left: 54,
    bottom: 47,
    width: 215,
    flexDirection: "row",
    alignItems: "center",
  },

  coverFooterCol2: {
    position: "absolute",
    left: 265,
    bottom: 47,
    width: 215,
    flexDirection: "row",
    alignItems: "center",
  },

  coverFooterCol3: {
    position: "absolute",
    left: 445,
    bottom: 47,
    width: 215,
    flexDirection: "row",
    alignItems: "center",
  },

  coverFooterIcon: {
    width: 26,
    height: 26,
    objectFit: "contain",
    marginRight: 14,
  },

  coverFooterText: {
    color: "#FFFFFF",
    fontSize: 9.5,
    lineHeight: 1.35,
  },

  coverFooterBold: {
    color: "#FFFFFF",
    fontSize: 8,
    fontWeight: "bold",
    lineHeight: 1.25,
  },

  page: {
    padding: 34,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: BLUE,
    backgroundColor: "#FFFFFF",
  },

  logoImage: {
    position: "absolute",
    left: 1,
    top: -50,
    width: 150,
    objectFit: "contain",
  },

  header: {
    position: "relative",
    height: 50,
    marginBottom: 35,
  },

  headerRight: {
    position: "absolute",
    left: 300,
    top: 10,
    width: 210,
    textAlign: "right",
    fontSize: 8,
    lineHeight: 1.4,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: "bold",
    marginBottom: 14,
  },

  sectionNumber: {
    color: GREEN,
    fontSize: 18,
  },

  thinLine: {
    width: 42,
    height: 2,
    backgroundColor: BLUE,
    marginBottom: 20,
  },

  macroTitle: {
    fontSize: 11,
    fontWeight: "bold",
    marginTop: 14,
    marginBottom: 8,
    textTransform: "uppercase",
  },

  workRow: {
    flexDirection: "row",
    backgroundColor: LIGHT,
    borderRadius: 8,
    marginBottom: 2,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },

  workLeft: {
    width: "76%",
    paddingRight: 12,
  },

  workName: {
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 3,
  },

  workDescription: {
    fontSize: 8.5,
    color: "#26345A",
    lineHeight: 1.25,
  },

  workPrice: {
    width: "24%",
    textAlign: "right",
    fontSize: 10,
    fontWeight: "bold",
  },

  totalsWrapper: {
    marginTop: 20,
    flexDirection: "row",
    gap: 12,
  },

  totalsBox: {
    flex: 1,
    border: "1 solid #D8DCE8",
    borderRadius: 8,
    padding: 12,
  },

  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 7,
    fontSize: 9,
  },

  grandTotalBox: {
    position: "relative",
    width: 210,
    backgroundColor: BLUE,
    borderRadius: 8,
    color: "#FFFFFF",
    padding: 16,
  },

  grandTotalIcon: {
    position: "absolute",
    right: 18,
    top: 5,
    width: 80,
    height: 80,
    objectFit: "contain",
    opacity: 0.1,
  },

  grandTotalLabel: {
    fontSize: 11,
    marginBottom: 8,
  },

  grandTotalValue: {
    fontSize: 22,
    fontWeight: "bold",
  },

  paymentCard: {
    position: "relative",
    flexDirection: "row",
    backgroundColor: "#F5F7FB",
    borderRadius: 14,
    marginBottom: 8,
    marginLeft: 23,
    height: 46,
    border: "1 solid #E3E7EF",
  },

  paymentIcon: {
    width: 46,
    height: 46,
    objectFit: "contain",
  },

  paymentIconContainer: {
    position: "absolute",
    left: -23,
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },

  paymentTextBox: {
    flex: 1,
    justifyContent: "center",
    paddingLeft: 45,
    paddingRight: 14,
  },

  paymentCardTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: BLUE,
    marginBottom: 4,
    textTransform: "uppercase",
  },

  paymentCardDescription: {
    fontSize: 9,
    color: "#26345A",
    lineHeight: 1.25,
  },

  paymentAmountBox: {
    width: 145,
    borderLeft: "1 solid #E4E8F0",
    alignItems: "center",
    justifyContent: "center",
  },

  paymentPercent: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 4,
  },

  paymentEuro: {
    fontSize: 12,
    fontWeight: "bold",
    color: BLUE,
  },

  paymentRow: {
    backgroundColor: LIGHT,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  paymentLeft: {
    width: "68%",
  },

  paymentName: {
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 3,
  },

  paymentDescription: {
    fontSize: 8.5,
    color: "#26345A",
    lineHeight: 1.25,
  },

  paymentAmount: {
    width: "32%",
    textAlign: "right",
    fontSize: 10,
    fontWeight: "bold",
  },

  conditionsBox: {
    marginTop: 6,
  },

  conditionsCard: {
    marginTop: 2,
    border: "1 solid #DCE2EC",
    borderRadius: 14,
    padding: 14,
    backgroundColor: "#FFFFFF",
  },

  conditionRow: {
    flexDirection: "row",
    marginBottom: 12,
    alignItems: "flex-start",
  },

  conditionCheck: {
    width: 14,
    fontSize: 18,
    color: "#4CAF50",
    marginTop: 1,
  },

  conditionCardText: {
    width: "95%",
    fontSize: 9,
    lineHeight: 1.35,
    color: "#26345A",
  },

  conditionText: {
    fontSize: 9,
    lineHeight: 1.1,
    textAlign: "justify",
    color: "#26345A",
    marginBottom: 8,
  },

  signatureCard: {
    marginTop: 14,
    border: "1 solid #DCE2EC",
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    backgroundColor: "#FAFBFD",
  },

  signatureColumn: {
    flex: 1,
  },

  signatureDivider: {
    width: 1,
    backgroundColor: "#DCE2EC",
    marginHorizontal: 20,
  },

  signatureTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: BLUE,
    marginBottom: 8,
  },

  signatureLine: {
    width: 200,
    borderTop: "1 solid #071E63",
    marginTop: 60,
  },

  signatureImage: {
    height: 75,
    objectFit: "contain",
  },
  
  signatureSection: {
    marginTop: 35,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  signatureBox: {
    width: 210,
  },

});

type Props = {
  cliente: any;
  lavorazioni: any[];
  imponibile: number;
  cassa: number;
  iva: number;
  sconto: number;
  totale: number;
  numeroPreventivo: string;
  pagamento?: any;
};

export default function PreventivoPDF({
  cliente,
  lavorazioni,
  imponibile,
  cassa,
  iva,
  sconto,
  totale,
  numeroPreventivo,
  pagamento,
}: Props) {
  const dataOggi = new Date().toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  function formatEuro(valore: number) {
    return valore.toLocaleString("it-IT", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function getMacroCategoria(voce: any) {
    return (
      voce.macroCategoria ||
      voce.macrocategoria ||
      voce.categoria ||
      voce.gruppo ||
      "Altro"
    );
  }

  function getDescrizione(voce: any) {
    return voce.descrizione || voce.note || "";
  }

  function getPagamentoColor(nome: string) {
    const voce = nome.toLowerCase();

    if (voce.includes("anticipo")) return "#4CAF50";
    if (voce.includes("progettazione")) return "#1E63B6";
    if (voce.includes("realizzazione")) return "#12A6B8";
    if (voce.includes("chiusura")) return "#8E3FAE";

    return GREEN;
  }

  function getPagamentoIcon(nome: string) {
    const voce = nome.toLowerCase();

    if (voce.includes("anticipo")) return "/pdf/icon-anticipo.png";
    if (voce.includes("progettazione")) return "/pdf/icon-progettazione.png";
    if (voce.includes("realizzazione")) return "/pdf/icon-realizzazione.png";
    if (voce.includes("chiusura")) return "/pdf/icon-chiusura.png";

    return "/pdf/icon-anticipo.png";
  }

  function getPagamentoRows() {
    if (!pagamento) return [];

    if (Array.isArray(pagamento)) {
      return pagamento
        .filter((p) => Number(p.percentuale) > 0)
        .map((p) => ({
          label: p.nome || p.label || p.titolo || "Pagamento",
          percentuale: Number(p.percentuale),
        }));
    }

    return Object.entries(pagamento)
      .filter(([, valore]) => Number(valore) > 0)
      .map(([chiave, valore]) => ({
        label: chiave
          .replaceAll("_", " ")
          .replace(/^\w/, (c) => c.toUpperCase()),
        percentuale: Number(valore),
      }));
  }

  function getDescrizionePagamento(nome: string) {
    const voce = nome.toLowerCase();

    if (voce.includes("anticipo")) {
      return "Da versare all’atto dell’accettazione del preventivo.";
    }

    if (voce.includes("progettazione")) {
      return "Da versare al completamento delle attività relative alla fase di progettazione indicate nel preventivo.";
    }

    if (voce.includes("realizzazione")) {
      return "Da versare al completamento delle attività relative alla fase di realizzazione indicate nel preventivo.";
    }

    if (voce.includes("chiusura")) {
      return "Da versare al completamento delle attività conclusive indicate nel preventivo.";
    }

    return "Da versare secondo le tempistiche concordate tra le parti.";
  }

  const pagamentoRows = getPagamentoRows();

  return (
    <Document>
      <Page size="A4" style={styles.cover}>
        <View style={styles.coverCanvas}>
          <Image src="/pdf/cover-image.png" style={styles.coverBackground} />

          <Image src="/pdf/logo-fidepa.jpg" style={styles.coverLogoImage} />

          <View style={styles.coverBadgesBox}>
            <Image src="/pdf/logo-iso.png" style={styles.coverBadge} />
            <Image src="/pdf/logo-esco.png" style={styles.coverBadge} />
            <Image src="/pdf/logo-sole24ore.png" style={styles.coverBadge} />
          </View>

          <Text style={styles.coverTitle}>PREVENTIVO</Text>
          <Text style={styles.coverNumber}>N. {numeroPreventivo}</Text>
          <Text style={styles.coverDate}>{dataOggi}</Text>

          <View style={styles.coverGreenLine} />
          <View style={styles.coverBlueLine} />

          <View style={[styles.coverInfoRow, { top: 415 }]}>
            <View style={styles.coverIconCircle}>
              <Image src="/pdf/icona-cliente.png" style={styles.coverIcon} />
            </View>

            <View style={styles.coverInfoContent}>
              <Text style={styles.coverInfoValue}>{cliente.cliente}</Text>
              {cliente.piva && (
                <Text style={styles.coverInfoText}>{cliente.piva}</Text>
              )}
            </View>
          </View>

          {cliente.indirizzo && (
            <View style={[styles.coverInfoRow, { top: 505 }]}>
              <View style={styles.coverIconCircle}>
                <Image src="/pdf/icona-indirizzo.png" style={styles.coverIcon} />
              </View>

              <View style={styles.coverInfoContent}>
                <Text style={styles.coverInfoValue}>{cliente.indirizzo}</Text>

                {cliente.comune && (
                  <Text style={styles.coverInfoText}>
                    {cliente.comune}
                  </Text>
                )}
              </View>
            </View>
          )}

          <View
            style={[
              styles.coverInfoRow,
              {
                top: cliente.indirizzo ? 595 : 505,
              },
            ]}
          >
            <View style={styles.coverIconCircle}>
              <Image src="/pdf/icona-oggetto.png" style={styles.coverIcon} />
            </View>

            <View style={styles.coverInfoContent}>
              <Text style={styles.coverInfoValue}>{cliente.oggetto}</Text>
            </View>
          </View>

          <View
            style={[
              styles.coverFooterCol1,
              {
                alignItems: "center",
              },
            ]}
          >
            <Image src="/pdf/icona-posizione.png" style={styles.coverFooterIcon} />

            <View>
              <Text style={styles.coverFooterText}>
                Via Caravaggio, 22{"\n"}
                84014 - Nocera Inferiore (SA){"\n"}
                P.IVA 06037250658
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.coverFooterCol2,
              {
                alignItems: "center",
              },
            ]}
          >
            <Image src="/pdf/icona-contatti.png" style={styles.coverFooterIcon} />

            <View>
              <Text style={styles.coverFooterText}>
                081 359 0295{"\n"}
                info@fidepa.it
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.coverFooterCol3,
              {
                alignItems: "center",
              },
            ]}
          >
            <Image src="/pdf/icona-social.png" style={styles.coverFooterIcon} />

            <View>
              <Text style={styles.coverFooterText}>
                fidepaing{"\n"}
                www.fidepa.it
              </Text>
            </View>
          </View>
                  </View>
                </Page>

                <Page size="A4" style={styles.page} wrap>
        <View style={styles.header} fixed>
          <Image src="/pdf/logo-fidepa.jpg" style={styles.logoImage} />

          <Text style={styles.headerRight}>
            Preventivo n. {numeroPreventivo}{"\n"}
            {new Date().toLocaleDateString("it-IT")}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>
          <Text style={styles.sectionNumber}>1. </Text>
          PRESTAZIONI PROFESSIONALI
        </Text>

        <View style={styles.thinLine} />

        {MACROCATEGORIE.map((macro) => {
          const vociMacro = lavorazioni.filter(
            (voce) => getMacroCategoria(voce) === macro
          );

          if (vociMacro.length === 0) return null;

          return (
            <View key={macro}>
              <Text style={styles.macroTitle}>{macro}</Text>

              {vociMacro.map((voce) => (
                <View key={voce.id} style={styles.workRow} wrap={false}>
                  <View style={styles.workLeft}>
                    <Text style={styles.workName}>{voce.nome}</Text>

                    {getDescrizione(voce) && (
                      <Text style={styles.workDescription}>
                        {getDescrizione(voce)}
                      </Text>
                    )}
                  </View>

                  <Text style={styles.workPrice}>
                    € {formatEuro(Number(voce.importo || 0))}
                  </Text>
                </View>
              ))}
            </View>
          );
        })}

        <View style={styles.totalsWrapper} wrap={false}>
          <View style={styles.totalsBox}>
            <View style={styles.totalRow}>
              <Text>Imponibile</Text>
              <Text>€ {formatEuro(imponibile)}</Text>
            </View>

            <View style={styles.totalRow}>
              <Text>Cassa Previdenziale (4%)</Text>
              <Text>€ {formatEuro(cassa)}</Text>
            </View>

            <View style={styles.totalRow}>
              <Text>IVA (22%)</Text>
              <Text>€ {formatEuro(iva)}</Text>
            </View>

            {sconto > 0 && (
              <View style={styles.totalRow}>
                <Text
                  style={{
                    color: "#C62828",
                    fontWeight: "bold",
                  }}
                >
                  Sconto
                </Text>

                <Text
                  style={{
                    color: "#C62828",
                    fontWeight: "bold",
                  }}
                >
                  - € {formatEuro(sconto)}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.grandTotalBox}>
            <Image
              src="/pdf/layers.png"
              style={styles.grandTotalIcon}
            />

            <Text style={styles.grandTotalLabel}>TOTALE</Text>

            <Text style={styles.grandTotalValue}>
              € {formatEuro(totale)}
            </Text>
          </View>
        </View>

      </Page>

      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Image src="/pdf/logo-fidepa.jpg" style={styles.logoImage} />

          <Text style={styles.headerRight}>
            Preventivo n. {numeroPreventivo}{"\n"}
            del {new Date().toLocaleDateString("it-IT")}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>
          <Text style={styles.sectionNumber}>2. </Text>
          MODALITÀ DI PAGAMENTO
        </Text>

        <View style={styles.thinLine} />

        {pagamentoRows.length > 0 ? (
          pagamentoRows.map((riga, index) => {
            const colore = getPagamentoColor(riga.label);

            return (
              <View key={index} style={styles.paymentCard}>
                <View style={styles.paymentIconContainer}>
                  <Image
                    src={getPagamentoIcon(riga.label)}
                    style={styles.paymentIcon}
                  />
                </View>

                <View style={styles.paymentTextBox}>
                  <Text style={styles.paymentCardTitle}>{riga.label}</Text>
                  <Text style={styles.paymentCardDescription}>
                    {getDescrizionePagamento(riga.label)}
                  </Text>
                </View>

                <View style={styles.paymentAmountBox}>
                  <Text style={[styles.paymentPercent, { color: colore }]}>
                    {riga.percentuale}%
                  </Text>

                  <Text style={styles.paymentEuro}>
                    € {formatEuro((totale * riga.percentuale) / 100)}
                  </Text>
                </View>
              </View>
            );
          })
        ) : (
          <Text style={styles.conditionText}>
            Le modalità di pagamento saranno concordate tra le parti in sede di
            accettazione del preventivo.
          </Text>
        )}

        <View style={styles.conditionsBox}>
          <Text style={styles.sectionTitle}>
            <Text style={styles.sectionNumber}>3. </Text>
            NOTE E CONDIZIONI
          </Text>

          <View style={styles.thinLine} />

          <View style={styles.conditionsCard}>
            <View style={styles.conditionRow}>
              <Text style={styles.conditionCheck}>•</Text>
              <Text style={styles.conditionCardText}>
                Eventuali prestazioni non espressamente indicate nel presente
                preventivo saranno considerate escluse e contabilizzate
                separatamente.
              </Text>
            </View>

            <View style={styles.conditionRow}>
              <Text style={styles.conditionCheck}>•</Text>
              <Text style={styles.conditionCardText}>
                Gli importi indicati non comprendono eventuali oneri amministrativi,
                diritti di segreteria, bolli, tributi o spese richieste dagli enti
                competenti.
              </Text>
            </View>

            <View style={styles.conditionRow}>
              <Text style={styles.conditionCheck}>•</Text>
              <Text style={styles.conditionCardText}>
                L’incarico sarà svolto nel rispetto della normativa vigente e degli
                standard qualitativi adottati da FIDEPA.
              </Text>
            </View>

            <View style={styles.conditionRow}>
              <Text style={styles.conditionCheck}>•</Text>
              <Text style={styles.conditionCardText}>
                Per tutto quanto non espressamente indicato nel presente preventivo,
                si farà riferimento alle condizioni generali di incarico concordate
                tra le parti.
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.signatureCard}>
          <View style={styles.signatureColumn}>
            <Text style={styles.signatureTitle}>Firma Cliente</Text>

            <View style={styles.signatureLine} />
          </View>

          <View style={styles.signatureDivider} />

          <View style={[styles.signatureColumn, { alignItems: "center" }]}>
            <Text style={styles.signatureTitle}>
              FIDEPA Ingegneri Associati
            </Text>

            <Image
              src="/pdf/timbro.png"
              style={styles.signatureImage}
            />
          </View>
        </View>

      </Page>
    </Document>
  );
}