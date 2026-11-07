/**
 * Module Scan & Vérification conforme au Modèle de Données strict
 * - Capture / Upload de tickets
 * - Prévisualisation & Prétraitement Canvas
 * - Reconnaissance OCR (Tesseract.js)
 * - Validation & correction manuelle des champs extraits :
 *   id, date, commercant, montant_total, categorie, sous_categorie, articles [{ nom, prix, quantite }], fichier_image
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Upload,
  RefreshCw,
  Check,
  RotateCw,
  Plus,
  Trash2,
  AlertCircle,
  Sparkles,
  Eye,
} from 'lucide-react';
import {
  TransactionTicket,
  ExpenseCategory,
  ArticleItem,
} from '../types/expense';
import { categoriesService } from '../services/categoriesService';
import { ArticlesSummaryRepere } from './ArticlesSummaryRepere';
import {
  preprocessImage,
  runOcrOnImage,
  parseReceiptText,
  DEMO_SAMPLE_RECEIPTS,
} from '../services/ocr';

interface ScanModuleProps {
  onSaveExpense: (expense: TransactionTicket) => void;
  onCancel?: () => void;
}

export const ScanModule: React.FC<ScanModuleProps> = ({ onSaveExpense, onCancel }) => {
  const [step, setStep] = useState<'capture' | 'processing' | 'verify'>('capture');

  // Images
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [rotation, setRotation] = useState<number>(0);

  // État OCR
  const [ocrProgress, setOcrProgress] = useState<{ status: string; percent: number }>({
    status: '',
    percent: 0,
  });
  const [rawOcrText, setRawOcrText] = useState<string>('');
  const [showRawText, setShowRawText] = useState<boolean>(false);
  const [ocrError, setOcrError] = useState<string | null>(null);

  // Formulaire de vérification (Champs stricts du Data Model)
  const [commercant, setCommercant] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [montantTotal, setMontantTotal] = useState<number>(0);
  const [categorie, setCategorie] = useState<ExpenseCategory>('Alimentation');
  const [sousCategorie, setSousCategorie] = useState<string>('Supermarché & Courses');
  const [articles, setArticles] = useState<ArticleItem[]>([]);
  const [heure, setHeure] = useState<string>('12:00');
  const [tva, setTva] = useState<number | undefined>(undefined);
  const [modePaiement, setModePaiement] = useState<string>('Carte Bancaire');
  const [commentaires, setCommentaires] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Mode Caméra Live
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Synchronisation de la sous-catégorie par défaut lors du changement de catégorie
  const handleCategoryChange = (newCat: ExpenseCategory) => {
    setCategorie(newCat);
    const availableSubs = categoriesService.getSubcategories(newCat);
    setSousCategorie(availableSubs[0] || 'Divers');
  };

  const handleSumArticlesToTotal = () => {
    const sum = articles.reduce((acc, a) => acc + (a.prix || 0) * (a.quantite || 1), 0);
    setMontantTotal(Number(sum.toFixed(2)));
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      setOcrError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch {
      setOcrError("Impossible d'accéder à la caméra. Vérifiez les autorisations du navigateur.");
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      stopCamera();
      handleImageLoaded(dataUrl);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => handleImageLoaded(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => handleImageLoaded(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleImageLoaded = async (imageDataUrl: string) => {
    setOriginalImage(imageDataUrl);
    setOcrError(null);
    setRotation(0);

    try {
      const prep = await preprocessImage(imageDataUrl);
      setProcessedImage(prep.processedDataUrl);
      startOcrProcessing(prep.processedDataUrl);
    } catch (e: any) {
      setOcrError("Erreur lors de la préparation de l'image: " + e.message);
    }
  };

  const handleRotate = async () => {
    if (!originalImage) return;
    const newRot = (rotation + 90) % 360;
    setRotation(newRot);

    const img = new Image();
    img.src = originalImage;
    img.onload = async () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      if (newRot === 90 || newRot === 270) {
        canvas.width = img.height;
        canvas.height = img.width;
      } else {
        canvas.width = img.width;
        canvas.height = img.height;
      }

      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((newRot * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);

      const rotatedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
      const prep = await preprocessImage(rotatedDataUrl);
      setProcessedImage(prep.processedDataUrl);
    };
  };

  const startOcrProcessing = async (imageToScan: string) => {
    setStep('processing');
    setOcrProgress({ status: 'Initialisation du modèle OCR...', percent: 10 });

    try {
      const ocrResult = await runOcrOnImage(imageToScan, (p) => setOcrProgress(p));
      setRawOcrText(ocrResult.text);

      const parsed = parseReceiptText(ocrResult.text, ocrResult.confidence);

      setCommercant(parsed.commercant || 'Commerçant Inconnu');
      setDate(parsed.date || new Date().toISOString().split('T')[0]);
      if (parsed.heure) setHeure(parsed.heure);
      setMontantTotal(parsed.montant_total || 0);
      setCategorie(parsed.categorie || 'Alimentation');
      setSousCategorie(parsed.sous_categorie || 'Supermarché & Courses');
      setArticles(parsed.articles || []);
      setTva(parsed.tva);
      setModePaiement(parsed.mode_paiement || 'Carte Bancaire');
      setCommentaires(`Numérisé par OCR (${Math.round(ocrResult.confidence)}% confiance)`);

      setStep('verify');
    } catch {
      setOcrError("L'OCR n'a pas pu traiter l'image. Veuillez saisir les montants manuellement.");
      setStep('verify');
    }
  };

  const handleLoadDemoReceipt = (demoIndex: number) => {
    const demo = DEMO_SAMPLE_RECEIPTS[demoIndex];
    setRawOcrText(demo.text);
    const parsed = parseReceiptText(demo.text, 95);

    setCommercant(demo.commercant);
    setDate(demo.date);
    setMontantTotal(demo.total);
    setCategorie(demo.categorie);
    setSousCategorie(demo.sous_categorie);
    setArticles(parsed.articles || []);
    setTva(parsed.tva);
    setModePaiement(parsed.mode_paiement || 'Carte Bancaire');
    setCommentaires(`Ticket d'exemple : ${demo.title}`);
    setOriginalImage(null);
    setProcessedImage(null);
    setStep('verify');
  };

  const handleAddArticle = () => {
    setArticles((prev) => [...prev, { nom: 'Nouvel article', prix: 0.0, quantite: 1 }]);
  };

  const handleUpdateArticle = (index: number, field: keyof ArticleItem, value: any) => {
    setArticles((prev) =>
      prev.map((art, idx) => (idx === index ? { ...art, [field]: value } : art))
    );
  };

  const handleRemoveArticle = (index: number) => {
    setArticles((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleConfirmSave = () => {
    setValidationError(null);
    if (!commercant.trim()) {
      setValidationError('Veuillez renseigner le nom du commerçant.');
      return;
    }
    if (montantTotal <= 0) {
      setValidationError('Veuillez indiquer un montant total valide supérieur à 0.');
      return;
    }

    const newTicket: TransactionTicket = {
      id: `rec_${Date.now()}`,
      date,
      commercant: commercant.trim(),
      montant_total: Number(montantTotal.toFixed(2)),
      categorie,
      sous_categorie: sousCategorie,
      articles,
      heure: heure.trim() || '12:00',
      tva: tva !== undefined ? Number(tva.toFixed(2)) : 0,
      mode_paiement: modePaiement,
      commentaires: commentaires.trim(),
    };

    onSaveExpense(newTicket);
  };

  const handleReset = () => {
    setStep('capture');
    setOriginalImage(null);
    setProcessedImage(null);
    setArticles([]);
    setMontantTotal(0);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Module Scan & Vérification
          </h1>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
            <span>Numérisation OCR</span>
            <span aria-hidden="true">·</span>
            <span>Contrôle qualité & correction</span>
            <span aria-hidden="true">·</span>
            <span>Modèle de données structuré</span>
          </div>
        </div>

        {step === 'verify' && (
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-md transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Nouveau scan</span>
          </button>
        )}
      </div>

      {ocrError && (
        <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{ocrError}</span>
        </div>
      )}

      {/* ÉTAPE 1: CAPTURE */}
      {step === 'capture' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-4">
            {isCameraActive ? (
              <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center">
                <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline />
                <div className="absolute bottom-4 inset-x-0 flex items-center justify-center gap-4">
                  <button
                    onClick={capturePhoto}
                    className="px-6 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm flex items-center gap-2 shadow-lg"
                  >
                    <Camera className="w-5 h-5" />
                    <span>Prendre la photo</span>
                  </button>
                  <button
                    onClick={stopCamera}
                    className="px-4 py-2.5 rounded-full bg-slate-800/80 text-white text-sm"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-400 rounded-xl p-8 text-center bg-white dark:bg-slate-900 flex flex-col items-center justify-center min-h-[320px] transition-colors"
              >
                <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4">
                  <Upload className="w-7 h-7" />
                </div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  Déposez un ticket de caisse ici
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                  L'image reste 100% confinée dans votre navigateur pour le traitement OCR.
                </p>

                <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm"
                  >
                    Sélectionner une photo
                  </button>
                  <button
                    onClick={startCamera}
                    className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 rounded-lg flex items-center gap-1.5"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Utiliser la caméra</span>
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>
            )}
          </div>

          {/* Exemples rapides */}
          <div className="lg:col-span-4 space-y-4">
            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                <Sparkles className="w-4 h-4 text-emerald-500" />
                <span>Tester avec un exemple</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Aucun ticket sous la main ? Chargez un exemple pour tester l'extraction :
              </p>

              <div className="space-y-2">
                {DEMO_SAMPLE_RECEIPTS.map((demo, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleLoadDemoReceipt(idx)}
                    className="w-full text-left p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-emerald-500 bg-slate-50/50 dark:bg-slate-800/40 transition-colors"
                  >
                    <div className="flex justify-between items-center text-xs font-semibold text-slate-900 dark:text-white">
                      <span>{demo.commercant}</span>
                      <span className="font-mono tabular-nums">{demo.total.toFixed(2)} €</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {demo.categorie} · {demo.sous_categorie}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ÉTAPE 2: PROGRESSION OCR */}
      {step === 'processing' && (
        <div className="p-12 text-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 max-w-md mx-auto space-y-5">
          <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto">
            <RefreshCw className="w-7 h-7 animate-spin" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Traitement OCR en cours
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {ocrProgress.status}
            </p>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-emerald-600 dark:bg-emerald-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.max(5, ocrProgress.percent)}%` }}
            />
          </div>
          <div className="text-xs font-mono tabular-nums text-slate-400">
            {ocrProgress.percent}%
          </div>
        </div>
      )}

      {/* ÉTAPE 3: VÉRIFICATION & VALIDATION */}
      {step === 'verify' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Aperçu du justificatif */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Justificatif Scanné
                </span>
                {originalImage && (
                  <button
                    onClick={handleRotate}
                    className="p-1 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded flex items-center gap-1"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Rotation</span>
                  </button>
                )}
              </div>

              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 p-2 min-h-[300px] max-h-[460px] overflow-auto flex items-center justify-center">
                {processedImage || originalImage ? (
                  <img
                    src={processedImage || originalImage!}
                    alt="Ticket de caisse"
                    className="max-h-[440px] w-auto object-contain rounded"
                  />
                ) : (
                  <div className="p-3 font-mono text-[11px] text-slate-500 whitespace-pre-wrap max-h-80 overflow-y-auto">
                    {rawOcrText}
                  </div>
                )}
              </div>

              {rawOcrText && (
                <div>
                  <button
                    onClick={() => setShowRawText(!showRawText)}
                    className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{showRawText ? 'Masquer texte OCR brut' : 'Voir texte OCR brut'}</span>
                  </button>
                  {showRawText && (
                    <div className="mt-2 p-3 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-[11px] max-h-40 overflow-y-auto whitespace-pre-wrap">
                      {rawOcrText}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Formulaire de correction & validation stricte */}
          <div className="lg:col-span-7 space-y-4">
            <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Vérification des Données
                  </h3>
                  <p className="text-xs text-slate-500">
                    Structure stricte conforme au Data Model.
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  <Check className="w-4 h-4" />
                  <span>Prêt à valider</span>
                </div>
              </div>

              {validationError && (
                <div className="p-3 text-xs bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-lg">
                  {validationError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Commerçant */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    commercant *
                  </label>
                  <input
                    type="text"
                    value={commercant}
                    onChange={(e) => setCommercant(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Montant Total */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    montant_total (€) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={montantTotal === 0 ? '' : montantTotal}
                    onChange={(e) => setMontantTotal(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-sm font-mono font-bold tabular-nums rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Date */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    date (YYYY-MM-DD) *
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Heure */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    heure (HH:MM) *
                  </label>
                  <input
                    type="time"
                    value={heure}
                    onChange={(e) => setHeure(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* TVA */}
                <div className="sm:col-span-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      tva (€) - Montant de la TVA
                    </label>
                    {montantTotal > 0 && (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                        <span>Calculer au taux :</span>
                        {[20, 10, 5.5, 2.1].map((rate) => (
                          <button
                            key={rate}
                            type="button"
                            onClick={() => {
                              const calc = Number((montantTotal - montantTotal / (1 + rate / 100)).toFixed(2));
                              setTva(calc);
                            }}
                            className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:border-emerald-500 text-xs font-mono tabular-nums text-slate-700 dark:text-slate-200 transition-colors"
                          >
                            {rate}%
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={tva === undefined || tva === 0 ? '' : tva}
                      onChange={(e) => setTva(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-full pl-3 pr-8 py-2 text-sm font-mono font-semibold tabular-nums rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-slate-400">€</span>
                  </div>
                </div>

                {/* Catégorie */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    categorie *
                  </label>
                  <select
                    value={categorie}
                    onChange={(e) => handleCategoryChange(e.target.value as ExpenseCategory)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {categoriesService.getCategoryNames().map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sous-catégorie */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    sous_categorie *
                  </label>
                  <select
                    value={sousCategorie}
                    onChange={(e) => setSousCategorie(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {categoriesService.getSubcategories(categorie).map((sub) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tableau des articles [{ nom, prix, quantite }] AVEC POINT DE REPÈRE */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    articles ({articles.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleAddArticle}
                    className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ajouter un article</span>
                  </button>
                </div>

                {/* Point de repère articles pendant la modification */}
                <ArticlesSummaryRepere
                  articles={articles}
                  montantTotal={montantTotal}
                  onApplyTotal={handleSumArticlesToTotal}
                />

                {articles.length === 0 ? (
                  <div className="py-3 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                    Aucun article détecté. Vous pouvez en ajouter si vous souhaitez le détail.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                    {articles.map((art, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={art.nom}
                          onChange={(e) => handleUpdateArticle(idx, 'nom', e.target.value)}
                          placeholder="nom"
                          className="flex-1 px-2.5 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        />
                        <div className="w-16 shrink-0">
                          <input
                            type="number"
                            min="1"
                            value={art.quantite || 1}
                            onChange={(e) =>
                              handleUpdateArticle(idx, 'quantite', parseInt(e.target.value, 10) || 1)
                            }
                            placeholder="qte"
                            title="Quantité"
                            className="w-full px-2 py-1.5 text-xs font-mono text-center rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                          />
                        </div>
                        <div className="w-24 shrink-0 relative">
                          <input
                            type="number"
                            step="0.01"
                            value={art.prix === 0 ? '' : art.prix}
                            onChange={(e) =>
                              handleUpdateArticle(idx, 'prix', parseFloat(e.target.value) || 0)
                            }
                            placeholder="prix"
                            className="w-full pl-2 pr-6 py-1.5 text-xs font-mono tabular-nums text-right rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                          />
                          <span className="absolute right-2 top-1.5 text-[10px] text-slate-400">€</span>
                        </div>
                        <button
                          onClick={() => handleRemoveArticle(idx)}
                          className="p-1 text-slate-400 hover:text-rose-500"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={handleReset}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  onClick={handleConfirmSave}
                  className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm"
                >
                  <Check className="w-4 h-4" />
                  <span>Enregistrer la transaction</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
