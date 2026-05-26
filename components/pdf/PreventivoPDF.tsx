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

const styles = StyleSheet.create({
  background: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 595,
    height: 842,
    zIndex: -1,
  },

  content: {
    width: "100%",
  },

  topLogos: {
    position: "absolute",
    top: -100,
    left: -15,
    flexDirection: "row",
    gap: 12,
  },

  smallLogo: {
    width: 65,
    height: 35,
    objectFit: "contain",
    },

  page: {
    paddingTop: 170,
    paddingLeft: 45,
    paddingRight: 45,
    paddingBottom: 90,
    fontSize: 10,
    fontFamily: "Helvetica",
    lineHeight: 1.0,
    color: "#222222",
    position: "relative",
  },

  header: {
    marginBottom: 30,
    borderBottom: "2 solid #2B2E65",
    paddingBottom: 15,
  },

  company: {
    fontSize: 24,
    color: "#2B2E65",
    fontWeight: "bold",
    marginBottom: 5,
  },

  title: {
    fontSize: 16,
    marginTop: 5,
    fontWeight: "bold",
    color: "#2B2E65",
  },

  section: {
    marginBottom: 28,
  },

  subtitle: {
    fontSize: 14,
    marginBottom: 12,
    color: "#2B2E65",
    fontWeight: "bold",
  },

  clientName: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#2B2E65",
  },

  clientRow: {
    marginBottom: 5,
  },

  tableHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#2B2E65",
    color: "white",
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontWeight: "bold",
  },

  tableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottom: "1 solid #DDDDDD",
  },

  totalsContainer: {
    marginTop: 25,
    marginLeft: "auto",
    width: 250,
  },

  discountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    color: "#C00000",
    fontWeight: "bold",
    },

  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },

  grandTotal: {
    borderTop: "2 solid #2B2E65",
    paddingTop: 10,
    marginTop: 10,
    fontSize: 14,
    fontWeight: "bold",
    color: "#2B2E65",
  },

  clausesSection: {
    marginTop: 50,
  },

  clause: {
    marginBottom: 6,
    textAlign: "justify",
    fontSize: 9,
    lineHeight: 1.2,
  },

  signatureSection: {
    marginTop: 25,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  signatureBox: {
    width: 220,
  },

  signatureLine: {
    marginTop: 35,
    borderTop: "1 solid #000000",
    paddingTop: 5,
    fontSize: 10,
  },

  stampContainer: {
    position: "absolute",
    top: -40,
    left: 20,
  },

  stamp: {
    width: 140,
    opacity: 0.75,
  },

  finalBlock: {
    marginTop: 20,
  },

  footer: {
    position: "absolute",
    bottom: 10,
    left: 45,
    right: 45,
    borderTop: "1 solid #CCCCCC",
    paddingTop: 8,
    fontSize: 9,
    color: "#666666",
    textAlign: "center",
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
}: Props) {
  const dataOggi = new Date().toLocaleDateString("it-IT");
  function formatEuro(valore: number) {
    return valore.toLocaleString("it-IT", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        <Image
          src="/pdf/carta-intestata.png"
          style={styles.background}
          fixed
        />

        <View style={styles.content}>

        <View style={styles.topLogos} fixed>
            <Image src="/pdf/logo-esco.png" style={styles.smallLogo} />
            <Image src="/pdf/logo-iso.png" style={styles.smallLogo} />
            <Image src="/pdf/logo-sole24ore.png" style={styles.smallLogo} />
        </View>

        {/* HEADER */}

        <View style={styles.header}>
          <Text style={styles.title}>
            Preventivo n. {numeroPreventivo} del {dataOggi}
          </Text>
        </View>

        {/* CLIENTE */}

        <View style={styles.section}>
          {cliente.cliente && (
            <Text style={[styles.clientRow, styles.clientName]}>
              {cliente.cliente}
            </Text>
          )}

          {cliente.piva && (
            <Text style={styles.clientRow}>
              {cliente.piva}
            </Text>
          )}

          {cliente.indirizzo && (
            <Text style={styles.clientRow}>
              {cliente.indirizzo}
            </Text>
          )}

          {cliente.comune && (
            <Text style={styles.clientRow}>
              {cliente.comune}
            </Text>
          )}

          {cliente.oggetto && (
            <Text style={styles.clientRow}>
              {cliente.oggetto}
            </Text>
          )}
        </View>

        {/* LAVORAZIONI */}

        <View style={styles.section}>

          <View style={styles.tableHeader}>
            <Text>Prestazione professionale</Text>
            <Text>Importo</Text>
          </View>

          {lavorazioni.map((voce) => (
            <View key={voce.id} style={styles.tableRow}>
              <Text>{voce.nome}</Text>

              <Text>
                € {formatEuro(voce.importo)}
              </Text>
            </View>
          ))}
        </View>

        {/* TOTALI */}

        <View style={styles.totalsContainer} wrap={false}>

          <View style={styles.totalRow}>
            <Text>Imponibile</Text>
            <Text>€ {formatEuro(imponibile)}</Text>
          </View>

          <View style={styles.totalRow}>
            <Text>Cassa Previdenziale 4%</Text>
            <Text>€ {formatEuro(cassa)}</Text>
          </View>

          <View style={styles.totalRow}>
            <Text>IVA 22%</Text>
            <Text>€ {formatEuro(iva)}</Text>
          </View>

            {sconto > 0 && (
            <View style={styles.discountRow}>
                <Text>Sconto</Text>
                <Text>- € {formatEuro(sconto)}</Text>
            </View>
            )}
          <View style={[styles.totalRow, styles.grandTotal]}>
            <Text>TOTALE</Text>
            <Text>€ {formatEuro(totale)}</Text>
          </View>

        </View>

        <View style={styles.finalBlock}>

        {/* CLAUSOLE */}

        <View style={styles.clausesSection} wrap={false}>
          
          <Text style={styles.clause}>
            Il presente preventivo ha validità di 30 giorni dalla data di emissione.
            Eventuali prestazioni non espressamente indicate saranno considerate escluse e contabilizzate separatamente.
            I compensi sopra indicati si intendono al netto di eventuali oneri amministrativi, diritti di segreteria e bolli.
            L'incarico sarà svolto nel rispetto delle normative vigenti e degli standard qualitativi adottati da FIDEPA.
          </Text>
        </View>

        {/* FIRME */}

        <View style={styles.signatureSection} wrap={false}>

          <View style={styles.signatureBox}>
            <Text style={styles.signatureLine}>
              Firma Cliente
            </Text>
          </View>

          <View style={styles.signatureBox}>

          <Text style={styles.signatureLine}>
            FIDEPA Ingegneri Associati
          </Text>

          <View style={styles.stampContainer}>
            <Image
              src="/pdf/timbro.png"
              style={styles.stamp}
            />
          </View>

        </View>

        </View>

      </View>

      </View>

        {/* FOOTER */}

        <View style={styles.footer} fixed>
          <Text>
            FIDEPA SRL - Via Caravaggio 22 - 84014 Nocera Inferiore (SA)
          </Text>

          <Text>
            P.IVA 06196470659 - www.fidepa.it
          </Text>
        </View>

      </Page>
    </Document>
  );
}