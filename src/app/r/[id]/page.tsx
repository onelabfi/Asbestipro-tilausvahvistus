'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import type { Order, Sample } from '@/lib/supabase';
// Extract the storage path from a Supabase signed URL
// e.g. .../object/sign/sample-photos/orderId/sampleId/file.jpg?token=... → orderId/sampleId/file.jpg
function toProxyUrl(signedUrl: string): string {
  try {
    const url = new URL(signedUrl);
    const match = url.pathname.match(/\/object\/sign\/sample-photos\/(.+)/);
    if (match) return `/api/photo-proxy?path=${encodeURIComponent(match[1])}`;
  } catch {}
  return signedUrl; // fallback to original
}

import {
  TUTKIMUSMENETELMAT,
  ANALYYSIVARMUUS,
  ANALYSOINTIMENETELMA,
  SOPIMUSEHDOT,
  KARTOITTAJA,
  KARTOITTAJA_TITLE,
  KARTOITTAJA_CREDENTIALS,
  COMPANY_NAME,
  COMPANY_YTUNNUS,
  COMPANY_ADDRESS,
  generateYleista,
  parseLocationForReport,
} from '@/lib/reportTexts';

function ReportHeader({ title, subtitle, dateStr, logo, companyInfo }: { title: string; subtitle?: string; dateStr: string; logo?: string; companyInfo?: string }) {
  return (
    <div className="report-header rounded-t-2xl print:rounded-none px-8 sm:px-10 py-6" style={{ backgroundColor: '#101921' }}>
      <div className="flex items-center justify-between">
        <div>
          <img src={logo || "/logo.png"} alt={COMPANY_NAME} className="h-12 mb-2 print:h-10" />
          <p className="text-[11px] text-white/50">
            {companyInfo || `${COMPANY_NAME}, Y-tunnus ${COMPANY_YTUNNUS}`}
          </p>
          {!companyInfo && <p className="text-[11px] text-white/50">{COMPANY_ADDRESS}</p>}
        </div>
        <div className="text-right">
          <h2 className="text-base font-bold tracking-wide text-white">{title}</h2>
          {subtitle && <p className="text-[11px] text-white/60">{subtitle}</p>}
          <p className="text-[11px] text-white/50 mt-1">{dateStr}</p>
        </div>
      </div>
    </div>
  );
}

export default function PublicReportPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetch(`/api/orders/${id}`).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/orders/${id}/samples`).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([orderData, samplesData]) => {
        setOrder(orderData);
        setSamples(samplesData || []);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#101921' }}>
        <p className="text-gray-400">Ladataan raporttia...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#101921' }}>
        <p className="text-red-400">Raporttia ei löytynyt.</p>
      </div>
    );
  }

  const aikaDate = new Date(order.aika);
  const dateStr = aikaDate.toLocaleDateString('fi-FI', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  });

  const asbestosSamples = samples.filter((s) => s.asbestos_detected === true);
  const yleista = generateYleista(order, samples).join(' ');

  return (
    <div className="min-h-screen report-bg text-gray-900 text-[13px] leading-relaxed">
      {/* Print button */}
      <div className="print:hidden fixed top-4 right-4 z-50">
        <button
          onClick={() => window.print()}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 shadow-lg"
        >
          Lataa PDF
        </button>
      </div>

      {/* ═══════════════ PAGE 1: ASBESTIKARTOITUSRAPORTTI ═══════════════ */}
      <div className="max-w-[750px] mx-auto px-4 sm:px-6 pt-8 pb-4 print:px-0 print:py-0 print:max-w-none">
        <div className="rounded-2xl shadow-xl overflow-hidden border border-gray-700 print:rounded-none print:shadow-none print:border-none">
          <ReportHeader title="ASBESTIKARTOITUSRAPORTTI" dateStr={dateStr} />

          <div className="bg-white p-8 sm:p-10 print:p-0 print:pt-4">
            <table className="w-full mb-6">
              <tbody className="text-[13px]">
                <tr>
                  <td className="py-1 pr-8 text-gray-500 w-40">Kartoittaja</td>
                  <td className="py-1 font-medium">{KARTOITTAJA}</td>
                </tr>
                <tr>
                  <td className="py-1 pr-8 text-gray-500">Tilaaja</td>
                  <td className="py-1 font-medium">{order.nimi}</td>
                </tr>
                <tr>
                  <td className="py-1 pr-8 text-gray-500">Kartoituskohde</td>
                  <td className="py-1 font-medium">{order.osoite}</td>
                </tr>
                <tr>
                  <td className="py-1 pr-8 text-gray-500">Kartoituspäivä</td>
                  <td className="py-1 font-medium">{dateStr}</td>
                </tr>
              </tbody>
            </table>

            <div className="mb-6">
              <table className="w-full">
                <tbody>
                  <tr>
                    <td className="py-1 pr-8 text-gray-500 w-40 align-top">Yleistä kohteesta</td>
                    <td className="py-1 leading-relaxed">{yleista}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {asbestosSamples.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-bold mb-2">Asbestia sisältävät materiaalit</h3>
                <table className="w-full border-collapse text-[12px]">
                  <thead>
                    <tr className="border-b border-gray-400">
                      <th className="text-left py-1.5 pr-3 font-semibold text-gray-600">Sijainti</th>
                      <th className="text-left py-1.5 pr-3 font-semibold text-gray-600">Materiaali</th>
                      <th className="text-left py-1.5 pr-3 font-semibold text-gray-600">Tyyppi</th>
                      <th className="text-left py-1.5 pr-3 font-semibold text-gray-600">m²</th>
                      <th className="text-left py-1.5 font-semibold text-gray-600">Pölyävyys</th>
                    </tr>
                  </thead>
                  <tbody>
                    {asbestosSamples.map((s) => {
                      const { tila, selite } = parseLocationForReport(s.location);
                      return (
                        <tr key={s.id} className="border-b border-gray-200">
                          <td className="py-1.5 pr-3">{tila}</td>
                          <td className="py-1.5 pr-3">{selite}</td>
                          <td className="py-1.5 pr-3 text-red-700 font-medium">{s.asbestos_type || '-'}</td>
                          <td className="py-1.5 pr-3">{s.area_m2 ?? '-'}</td>
                          <td className="py-1.5">{s.polyavyys ?? 3}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mb-4">
              <table className="w-full">
                <tbody>
                  <tr>
                    <td className="py-1 pr-8 text-gray-500 w-40 align-top">Tutkimusmenetelmät</td>
                    <td className="py-1">{TUTKIMUSMENETELMAT}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mb-8">
              <table className="w-full">
                <tbody>
                  <tr>
                    <td className="py-1 pr-8 text-gray-500 w-40 align-top">Analyysivarmuus</td>
                    <td className="py-1">{ANALYYSIVARMUUS}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <hr className="border-gray-300 mb-4" />
            <div className="ml-40">
              <img
                src="/signature.png"
                alt="Allekirjoitus"
                className="h-16 mb-1 print:h-14"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              <p className="font-medium">{KARTOITTAJA}, {KARTOITTAJA_TITLE}</p>
              <p className="text-[11px] text-gray-500">{KARTOITTAJA_CREDENTIALS}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════ PAGE 2: LABORATORIOANALYYSI ═══════════════ */}
      <div className="max-w-[750px] mx-auto px-4 sm:px-6 py-4 print:px-0 print:py-0 print:max-w-none page-break-before">
        <div className="rounded-2xl shadow-xl overflow-hidden border border-gray-700 print:rounded-none print:shadow-none print:border-none">
          <ReportHeader
            title="ASBESTILABORATORIOANALYYSI"
            subtitle="- Liite kartoitusraporttiin"
            dateStr={dateStr}
            logo="/onelab logo.png"
            companyInfo="Onelab"
          />

          <div className="bg-white p-8 sm:p-10 print:p-0 print:pt-4">
            <table className="w-full mb-6">
              <tbody className="text-[13px]">
                <tr>
                  <td className="py-1 pr-8 text-gray-500 w-44">Tilaaja</td>
                  <td className="py-1 font-medium">{order.nimi}</td>
                </tr>
                <tr>
                  <td className="py-1 pr-8 text-gray-500">Näytteenottokohde</td>
                  <td className="py-1 font-medium">{order.osoite}</td>
                </tr>
                <tr>
                  <td className="py-1 pr-8 text-gray-500">Näytteenottaja</td>
                  <td className="py-1 font-medium">{KARTOITTAJA}</td>
                </tr>
                <tr>
                  <td className="py-1 pr-8 text-gray-500">Näytteenottopäivä</td>
                  <td className="py-1 font-medium">{dateStr}</td>
                </tr>
              </tbody>
            </table>

            <h3 className="text-sm font-semibold mb-2">Laboratoriotulokset</h3>
            <table className="w-full border-collapse text-[12px] mb-6">
              <thead>
                <tr className="border-b-2 border-gray-400">
                  <th className="text-left py-1.5 pr-3 font-semibold text-gray-600 w-12">Näyte</th>
                  <th className="text-left py-1.5 pr-3 font-semibold text-gray-600">Tila</th>
                  <th className="text-left py-1.5 pr-3 font-semibold text-gray-600">Selite</th>
                  <th className="text-left py-1.5 font-semibold text-gray-600">Tulos</th>
                </tr>
              </thead>
              <tbody>
                {samples.map((s, i) => {
                  const { tila, selite } = parseLocationForReport(s.location);
                  const tulos =
                    s.asbestos_detected === true
                      ? `Sisältää asbestia: ${s.asbestos_type || 'tyyppi tuntematon'}`
                      : 'Ei sisällä asbestia';
                  return (
                    <tr key={s.id} className="border-b border-gray-200">
                      <td className="py-2 pr-3">{i + 1}</td>
                      <td className="py-2 pr-3">{tila}</td>
                      <td className="py-2 pr-3">{selite}</td>
                      <td className={`py-2 ${s.asbestos_detected ? 'text-red-700 font-semibold' : ''}`}>{tulos}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="mb-4">
              <table className="w-full">
                <tbody>
                  <tr>
                    <td className="py-1 pr-8 text-gray-500 w-44 align-top">Analysointimenetelmä</td>
                    <td className="py-1">{ANALYSOINTIMENETELMA}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div>
              <table className="w-full">
                <tbody>
                  <tr>
                    <td className="py-1 pr-8 text-gray-500 w-44 align-top">Sopimusehdot</td>
                    <td className="py-1">{SOPIMUSEHDOT}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {samples.some((s) => s.photos && s.photos.length > 0) && (
              <div className="mt-8">
                <h3 className="text-sm font-semibold mb-4">Näytekuvat</h3>
                <div className="space-y-4">
                  {samples.map((s, i) => {
                    if (!s.photos || s.photos.length === 0) return null;
                    const { tila, selite } = parseLocationForReport(s.location);
                    return (
                      <div key={s.id}>
                        {s.photos.map((photoUrl, pi) => (
                          <div key={pi} className="mb-4 break-inside-avoid">
                            <img
                              src={toProxyUrl(photoUrl)}
                              alt={`Näyte ${i + 1}`}
                              className="max-w-full max-h-[400px] object-contain rounded border border-gray-200"
                            />
                            <p className="text-[12px] text-gray-600 mt-1">
                              Näyte {i + 1}: {tila}, {selite}
                            </p>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="h-8 print:hidden" />

      <style jsx global>{`
        .report-bg { background-color: #101921; }
        @media print {
          .report-bg { background: white !important; }
          .report-header { background-color: #101921 !important; break-inside: avoid; }
          body { background: white !important; }
          @page { margin: 10mm; size: A4; }
          .page-break-before { break-before: page; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
        @media screen {
          .page-break-before { margin-top: 0; }
        }
      `}</style>
    </div>
  );
}
