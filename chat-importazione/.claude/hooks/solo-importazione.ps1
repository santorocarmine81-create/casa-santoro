# Controllo delle scritture per le chat aperte nella cartella "chat-importazione"
# di Casa Santoro/Longobardi. Claude Code lo esegue prima di ogni Write, Edit,
# MultiEdit e NotebookEdit (vedi .claude\settings.json).
# Consente solo file chiamati importazione-casa.json, in una cartella che esiste gia'.
# Blocca tutto il resto. Se lo script non parte o va in errore, la scrittura
# viene bloccata lo stesso (onFailure: block in settings.json).
# Il file contiene solo caratteri ASCII: le lettere accentate sono scritte con [char].

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$NOME = 'importazione-casa.json'
$o = [string][char]0x00F2   # o accentata
$a = [string][char]0x00E0   # a accentata
$e = [string][char]0x00E8   # e accentata
$BLOCCO = "Bloccato: questa chat pu${o} solo leggere i file e creare o aggiornare importazione-casa.json. Non pu${o} modificare, rinominare, spostare o cancellare altri file."

function Esito([string]$decisione, [string]$motivo) {
  $risposta = @{
    hookSpecificOutput = @{
      hookEventName            = 'PreToolUse'
      permissionDecision       = $decisione
      permissionDecisionReason = $motivo
    }
  }
  $json = $risposta | ConvertTo-Json -Compress -Depth 5
  # In uscita solo caratteri ASCII: le lettere accentate diventano \uXXXX
  $sb = New-Object System.Text.StringBuilder
  foreach ($c in $json.ToCharArray()) {
    if ([int]$c -gt 127) { [void]$sb.AppendFormat('\u{0:x4}', [int]$c) } else { [void]$sb.Append($c) }
  }
  [Console]::Out.Write($sb.ToString())
  [Console]::Out.Flush()
  exit 0
}

try {
  # Input del hook: un oggetto JSON in UTF-8 su stdin
  $lettore = New-Object System.IO.StreamReader([Console]::OpenStandardInput(), (New-Object System.Text.UTF8Encoding($false)))
  $testo = $lettore.ReadToEnd()
  Add-Type -AssemblyName System.Web.Extensions
  $serializzatore = New-Object System.Web.Script.Serialization.JavaScriptSerializer
  $serializzatore.MaxJsonLength = [int]::MaxValue
  $dati = $serializzatore.DeserializeObject($testo)

  $strumento = [string]$dati['tool_name']
  if (@('Write', 'Edit', 'MultiEdit') -notcontains $strumento) { Esito 'deny' $BLOCCO }

  $parametri = $dati['tool_input']
  $percorso = ''
  if ($null -ne $parametri -and $parametri.ContainsKey('file_path')) { $percorso = [string]$parametri['file_path'] }
  if ([string]::IsNullOrWhiteSpace($percorso)) { Esito 'deny' $BLOCCO }

  # Niente percorsi speciali (\\?\ e \\.\) e niente flussi alternativi (es. LIBRETTO.pdf:nome)
  if ($percorso.StartsWith('\\?\') -or $percorso.StartsWith('\\.\') -or $percorso.StartsWith('//?/') -or $percorso.StartsWith('//./') -or $percorso.IndexOf(':', 2) -ge 0) {
    Esito 'deny' "$BLOCCO Percorso non accettato: $percorso"
  }

  $completo = [System.IO.Path]::GetFullPath($percorso)
  $nomeFile = [System.IO.Path]::GetFileName($completo)
  if (-not [string]::Equals($nomeFile, $NOME, [System.StringComparison]::OrdinalIgnoreCase)) {
    Esito 'deny' "$BLOCCO File richiesto: $completo"
  }

  $cartella = [System.IO.Path]::GetDirectoryName($completo)
  if ([string]::IsNullOrEmpty($cartella) -or -not [System.IO.Directory]::Exists($cartella)) {
    Esito 'deny' "Bloccato: la cartella $cartella non esiste. Questa chat scrive importazione-casa.json solo in una cartella che esiste gi${a}."
  }
  if ([System.IO.Directory]::Exists($completo)) {
    Esito 'deny' "$BLOCCO $completo ${e} una cartella."
  }
  if ([System.IO.File]::Exists($completo)) {
    $attributi = [System.IO.File]::GetAttributes($completo)
    if (($attributi -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) {
      Esito 'deny' "$BLOCCO $completo ${e} un collegamento a un altro file."
    }
  }

  Esito 'allow' "Consentito: $completo"
} catch {
  Esito 'deny' "$BLOCCO (Controllo non riuscito: $($_.Exception.Message))"
}
