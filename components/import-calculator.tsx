"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertTriangle, Plane, Package, Calculator, RefreshCw, TrendingUp } from "lucide-react"

type Regimen = "correo" | "courier"

interface DolarRates {
  tarjeta: number
  oficial: number
  loading: boolean
  error: boolean
}

interface Results {
  costoCompraPesos: number
  impuestosUsd: number
  impuestosPesos: number
  tasaCorreoPesos: number
  totalFinalPesos: number
}

export function ImportCalculator() {
  const [regimen, setRegimen] = useState<Regimen>("correo")
  const [precioFob, setPrecioFob] = useState<string>("")
  const [costoEnvio, setCostoEnvio] = useState<string>("0")
  const [pesoKg, setPesoKg] = useState<string>("1")
  const [enviosHechos, setEnviosHechos] = useState<string>("0")
  const [dolarRates, setDolarRates] = useState<DolarRates>({
    tarjeta: 1450,
    oficial: 920,
    loading: true,
    error: false,
  })
  const [alertas, setAlertas] = useState<string[]>([])
  const [results, setResults] = useState<Results | null>(null)
  const [showResults, setShowResults] = useState(false)

  useEffect(() => {
    fetchDolarRates()
  }, [])

  async function fetchDolarRates() {
    setDolarRates((prev) => ({ ...prev, loading: true, error: false }))
    try {
      const [resOficial, resTarjeta] = await Promise.all([
        fetch("https://dolarapi.com/v1/dolares/oficial"),
        fetch("https://dolarapi.com/v1/dolares/tarjeta"),
      ])

      const dataOficial = await resOficial.json()
      const dataTarjeta = await resTarjeta.json()

      setDolarRates({
        tarjeta: dataTarjeta?.venta || 1450,
        oficial: dataOficial?.venta || 920,
        loading: false,
        error: false,
      })
    } catch {
      setDolarRates((prev) => ({
        ...prev,
        loading: false,
        error: true,
      }))
    }
  }

  function getRegimenInfo(): string {
    if (regimen === "correo") {
      return "Franquicia de USD 50 libre de arancel. Sobre el excedente se paga el 50%."
    }
    return "Impuesto calculado sobre valor CIF (Producto + Envío). Límite de USD 3.000 por vuelo."
  }

  function calcular() {
    const fob = parseFloat(precioFob) || 0
    const envio = parseFloat(costoEnvio) || 0
    const peso = parseFloat(pesoKg) || 0
    const envios = parseInt(enviosHechos) || 0

    if (fob <= 0) {
      return
    }

    const nuevasAlertas: string[] = []

    // Verificación de límites legales
    if (regimen === "correo") {
      if (fob > 3000) {
        nuevasAlertas.push("El límite máximo por envío en el Puerta a Puerta es de USD 3.000.")
      }
      if (peso > 20) {
        nuevasAlertas.push("El peso máximo permitido por Correo Argentino es de 20 kg por paquete.")
      }
      if (envios >= 12) {
        nuevasAlertas.push("Ya consumiste tus 12 franquicias anuales. Se cobrará el 50% de impuesto directo sin descuento.")
      }
    } else {
      const valorCifTotal = fob + envio
      if (valorCifTotal > 3000) {
        nuevasAlertas.push("El valor CIF (Producto + Envío) supera el límite legal de USD 3.000 para Courier.")
      }
      if (peso > 50) {
        nuevasAlertas.push("El peso máximo permitido para Courier Privado es de 50 kg por vuelo.")
      }
    }

    setAlertas(nuevasAlertas)

    // Cálculo económico
    const totalCompraUsd = regimen === "courier" ? fob + envio : fob
    const costoCompraPesos = totalCompraUsd * dolarRates.tarjeta

    let impuestosUsd = 0
    let tasaCorreoPesos = 0

    if (regimen === "correo") {
      tasaCorreoPesos = 6000

      if (envios < 12) {
        if (fob > 50) {
          impuestosUsd = (fob - 50) * 0.5
        }
      } else {
        impuestosUsd = fob * 0.5
      }
    } else {
      const valorCif = fob + envio
      impuestosUsd = valorCif * 0.5
    }

    const impuestosPesos = impuestosUsd * dolarRates.oficial
    const totalFinalPesos = costoCompraPesos + impuestosPesos + tasaCorreoPesos

    setResults({
      costoCompraPesos,
      impuestosUsd,
      impuestosPesos,
      tasaCorreoPesos,
      totalFinalPesos,
    })
    setShowResults(true)
  }

  function formatPesos(valor: number): string {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(valor)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-6">
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-2xl md:text-3xl font-bold text-card-foreground flex items-center justify-center gap-2">
            ImportaFácil Arg
            <span className="text-2xl" role="img" aria-label="Bandera Argentina">🇦🇷</span>
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Calculá el costo real de tus compras al exterior con la normativa vigente.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Método de Envío */}
          <div className="space-y-2">
            <Label htmlFor="regimen" className="flex items-center gap-2 font-semibold">
              <Package className="h-4 w-4" />
              Método de Envío
            </Label>
            <Select value={regimen} onValueChange={(value: Regimen) => setRegimen(value)}>
              <SelectTrigger id="regimen">
                <SelectValue placeholder="Seleccionar método" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="correo">
                  <span className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Correo Argentino (Puerta a Puerta)
                  </span>
                </SelectItem>
                <SelectItem value="courier">
                  <span className="flex items-center gap-2">
                    <Plane className="h-4 w-4" />
                    Courier Privado (DHL, FedEx, etc.)
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground leading-relaxed">{getRegimenInfo()}</p>
          </div>

          {/* Precio FOB y Costo Envío */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="precioFob" className="font-semibold">
                Precio Producto (USD FOB)
              </Label>
              <Input
                id="precioFob"
                type="number"
                placeholder="Ej: 100"
                min="0"
                step="0.01"
                value={precioFob}
                onChange={(e) => setPrecioFob(e.target.value)}
              />
            </div>

            {regimen === "courier" && (
              <div className="space-y-2">
                <Label htmlFor="costoEnvio" className="font-semibold">
                  Costo Envío (USD Flete)
                </Label>
                <Input
                  id="costoEnvio"
                  type="number"
                  placeholder="Ej: 30"
                  min="0"
                  step="0.01"
                  value={costoEnvio}
                  onChange={(e) => setCostoEnvio(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Peso e historial de envíos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pesoKg" className="font-semibold">
                Peso Estimado (kg)
              </Label>
              <Input
                id="pesoKg"
                type="number"
                placeholder="Ej: 1.5"
                min="0"
                step="0.1"
                value={pesoKg}
                onChange={(e) => setPesoKg(e.target.value)}
              />
            </div>

            {regimen === "correo" && (
              <div className="space-y-2">
                <Label htmlFor="enviosHechos" className="font-semibold">
                  Envíos hechos este año
                </Label>
                <Input
                  id="enviosHechos"
                  type="number"
                  min="0"
                  max="12"
                  value={enviosHechos}
                  onChange={(e) => setEnviosHechos(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Máx 12 franquicias/año</p>
              </div>
            )}
          </div>

          {/* Cotizaciones del Dólar */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dolarTarjeta" className="flex items-center gap-2 font-semibold">
                <TrendingUp className="h-4 w-4" />
                Dólar Tarjeta ($)
              </Label>
              <Input
                id="dolarTarjeta"
                type="number"
                min="0"
                step="0.1"
                value={dolarRates.tarjeta}
                onChange={(e) =>
                  setDolarRates((prev) => ({
                    ...prev,
                    tarjeta: parseFloat(e.target.value) || 0,
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">
                {dolarRates.loading ? "Cargando..." : dolarRates.error ? "Valor por defecto" : "Actualizado (Con Impuestos)"}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dolarOficial" className="flex items-center gap-2 font-semibold">
                <TrendingUp className="h-4 w-4" />
                Dólar Oficial ($)
              </Label>
              <Input
                id="dolarOficial"
                type="number"
                min="0"
                step="0.1"
                value={dolarRates.oficial}
                onChange={(e) =>
                  setDolarRates((prev) => ({
                    ...prev,
                    oficial: parseFloat(e.target.value) || 0,
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">
                {dolarRates.loading ? "Cargando..." : dolarRates.error ? "Valor por defecto" : "Actualizado (Banco Nación)"}
              </p>
            </div>
          </div>

          {/* Botón de refrescar cotizaciones */}
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDolarRates}
            disabled={dolarRates.loading}
            className="w-full"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${dolarRates.loading ? "animate-spin" : ""}`} />
            Actualizar cotizaciones
          </Button>

          {/* Botón Calcular */}
          <Button onClick={calcular} className="w-full" size="lg" disabled={!precioFob || parseFloat(precioFob) <= 0}>
            <Calculator className="h-5 w-5 mr-2" />
            Calcular Costo Total
          </Button>

          {/* Alertas */}
          {alertas.length > 0 && (
            <div className="p-4 bg-accent/20 border-l-4 border-accent rounded-r-md space-y-1">
              {alertas.map((alerta, index) => (
                <p key={index} className="text-sm text-accent-foreground flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  {alerta}
                </p>
              ))}
            </div>
          )}

          {/* Resultados */}
          {showResults && results && (
            <div className="p-5 bg-primary/10 rounded-lg border-l-4 border-primary space-y-3">
              <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Resumen del Costo
              </h3>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Costo Total Compra (Valor Tarjeta):</span>
                  <span className="font-semibold text-card-foreground">{formatPesos(results.costoCompraPesos)}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted-foreground">Derechos de Importación (Aduana):</span>
                  <span className="font-semibold text-card-foreground">
                    {formatPesos(results.impuestosPesos)}{" "}
                    <span className="text-xs text-muted-foreground font-normal">(USD {results.impuestosUsd.toFixed(2)})</span>
                  </span>
                </div>

                {regimen === "correo" && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tasa de Presentación Correo:</span>
                    <span className="font-semibold text-card-foreground">{formatPesos(results.tasaCorreoPesos)}</span>
                  </div>
                )}

                <div className="flex justify-between pt-3 border-t-2 border-border">
                  <span className="font-bold text-card-foreground text-base">TOTAL ESTIMADO:</span>
                  <span className="font-bold text-primary text-lg">{formatPesos(results.totalFinalPesos)}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
