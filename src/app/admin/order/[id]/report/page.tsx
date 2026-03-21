'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import type { Order, Sample } from '@/lib/supabase';
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

function ReportHeader({ title, subtitle, dateStr }: { title: string; subtitle?: string; dateStr: string }) {
  return (
    <div className="report-header rounded-t-2xl print:rounded-none px-8 sm:px-10 py-6" style={{ backgroundColor: '#101921' }}>
      <div className="flex items-start justify-between">
        <div>
          <img src="/logo.png" alt={COMPANY_NAME} className="h-12 mb-2 print:h-10" />
          <p className="text-[11px] text-white/50">
            {COMPANY_NAME}, Y-tunnus {COMPANY_YTUNNUS}
          </p>
          <p className="text-[11px] text-white/50">{COMPANY_ADDRESS}</p>
        </div>
        <div className="text-right">
          <h2 className="text-base font-bold tracking-wide text-white">{title}</h2>
          {subtitle && (
            <p className="text-[11px] text-white/60">{subtitle}</p>
          )}
          <p className="text-[11px] text-white/50 mt-1">{dateStr}</p>
        </div>
      </div>
    </div>
  );
}

export default function ReportPage() {
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
        <p className="text-red-400">Tilausta ei löytynyt.</p>
      </div>
    );
  }

  const pendingSamples = samples.filter((s) => s.asbestos_detected === null);
  if (pendingSamples.length > 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8" style={{ backgroundColor: '#101921' }}>
        <div className="max-w-md text-center bg-white rounded-2xl p-8 shadow-xl">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Tulokset puuttuvat</h2>
          <p className="text-gray-600 mb-4">
            Raporttia ei voi luoda ennen kuin kaikkien näytteiden tulokset on syötetty.
          </p>
          <div className="text-left bg-gray-50 rounded-lg p-4">
            <p className="text-xs font-medium text-gray-500 mb-2">Odottavat näytteet:</p>
            {pendingSamples.map((s, i) => (
              <p key={s.id} className="text-sm text-gray-700">
                {i + 1}. {s.location}
              </p>
            ))}
          </div>
          <button
            onClick={() => window.history.back()}
            className="mt-4 text-sm text-blue-600 hover:text-blue-800"
          >
            ← Takaisin
          </button>
        </div>
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
  const yleistaParagraphs = generateYleista(order, samples);

  return (
    <div className="min-h-screen report-bg text-gray-900 text-[13px] leading-relaxed">
      {/* Print button */}
      <div className="print:hidden fixed top-4 right-4 z-50 flex gap-2">
        <button
          onClick={() => window.print()}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 shadow-lg"
        >
          Tulosta / PDF
        </button>
        <button
          onClick={() => window.history.back()}
          className="bg-white/10 text-white/80 px-4 py-2 rounded-lg text-sm font-medium hover:bg-white/20 shadow-lg backdrop-blur"
        >
          Takaisin
        </button>
      </div>

      {/* ═══════════════ PAGE 1: ASBESTIKARTOITUSRAPORTTI ═══════════════ */}
      <div className="max-w-[750px] mx-auto px-4 sm:px-6 pt-8 pb-4 print:px-0 print:py-0 print:max-w-none">
        <div className="rounded-2xl shadow-xl overflow-hidden print:rounded-none print:shadow-none">
          {/* Dark header */}
          <ReportHeader title="ASBESTIKARTOITUSRAPORTTI" dateStr={dateStr} />

          {/* White content */}
          <div className="bg-white p-8 sm:p-10 print:p-0 print:pt-4">
            {/* Info fields */}
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

            {/* Yleistä kohteesta */}
            <div className="mb-6">
              <table className="w-full">
                <tbody>
                  <tr>
                    <td className="py-1 pr-8 text-gray-500 w-40 align-top">Yleistä kohteesta</td>
                    <td className="py-1">
                      {yleistaParagraphs.map((p, i) => (
                        <span key={i}>
                          {p}
                          {i < yleistaParagraphs.length - 1 ? ' ' : ''}
                        </span>
                      ))}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Asbestos materials table */}
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
                          <td className="py-1.5">{s.polyavyys ?? '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tutkimusmenetelmät */}
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

            {/* Analyysivarmuus */}
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

            {/* Signature */}
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
        <div className="rounded-2xl shadow-xl overflow-hidden print:rounded-none print:shadow-none">
          {/* Dark header */}
          <ReportHeader
            title="MATERIAALINÄYTTEIDEN ASBESTILABORATORIOANALYYSI"
            subtitle="- Liite kartoitusraporttiin"
            dateStr={dateStr}
          />

          {/* White content */}
          <div className="bg-white p-8 sm:p-10 print:p-0 print:pt-4">
            {/* Info fields */}
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

            {/* Laboratoriotulokset */}
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
                      <td className={`py-2 ${s.asbestos_detected ? 'text-red-700 font-semibold' : ''}`}>
                        {tulos}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Analysointimenetelmä */}
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

            {/* Sopimusehdot */}
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
          </div>
        </div>
      </div>

      {/* Spacer for bottom */}
      <div className="h-8 print:hidden" />

      {/* Print styles */}
      <style jsx global>{`
        .report-bg { background-color: #101921; }
        @media print {
          .report-bg { background: white !important; }
          .report-header { background-color: #101921 !important; }
          body { background: white !important; }
          @page { margin: 10mm; size: A4; }
          .page-break-before { page-break-before: always; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
        @media screen {
          .page-break-before { margin-top: 0; }
        }
      `}</style>
    </div>
  );
}
