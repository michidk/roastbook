{{- define "roastbook.applicationEnvironment" -}}
{{- if and (or .Values.openai.providedExistingSecret .Values.openai.existingSecret) (not .Values.auth.enabled) }}
{{- fail "Provided AI requires auth.enabled=true" }}
{{- end }}
{{- if and .Values.openai.providedExistingSecret .Values.openai.existingSecret }}
{{- fail "Choose openai.existingSecret or openai.providedExistingSecret, not both" }}
{{- end }}
{{- if .Values.auth.enabled }}
envFrom:
  - secretRef:
      name: {{ required "auth.existingSecret is required for built-in authentication" .Values.auth.existingSecret }}
{{- end }}
{{- if .Values.openai.providedExistingSecret }}
  - secretRef:
      name: {{ .Values.openai.providedExistingSecret }}
{{- end }}
env:
  - name: AUTH_ENABLED
    value: {{ .Values.auth.enabled | quote }}
  - name: DATABASE_URL
    {{- if .Values.postgresql.existingSecret }}
    valueFrom:
      secretKeyRef:
        name: {{ .Values.postgresql.existingSecret }}
        key: {{ .Values.postgresql.existingSecretKey }}
    {{- else if .Values.postgresql.enabled }}
    valueFrom:
      secretKeyRef:
        name: {{ include "roastbook.postgresqlSecretName" . }}
        key: url
    {{- else }}
    valueFrom:
      secretKeyRef:
        name: {{ include "roastbook.dbSecretName" . }}
        key: url
    {{- end }}
  - name: STORAGE_PROVIDER
    value: {{ .Values.storage.provider | quote }}
  {{- if eq .Values.storage.provider "local" }}
  - name: STORAGE_PATH
    value: {{ .Values.storage.local.path | quote }}
  - name: STORAGE_URL
    value: "/media"
  {{- else if eq .Values.storage.provider "s3" }}
  - name: S3_BUCKET
    value: {{ .Values.storage.s3.bucket | quote }}
  - name: S3_REGION
    value: {{ .Values.storage.s3.region | quote }}
  {{- if .Values.storage.s3.endpoint }}
  - name: S3_ENDPOINT
    value: {{ .Values.storage.s3.endpoint | quote }}
  {{- end }}
  - name: S3_ACCESS_KEY_ID
    valueFrom:
      secretKeyRef:
        name: {{ .Values.storage.s3.existingSecret }}
        key: {{ .Values.storage.s3.existingSecretAccessKeyIdKey }}
  - name: S3_SECRET_ACCESS_KEY
    valueFrom:
      secretKeyRef:
        name: {{ .Values.storage.s3.existingSecret }}
        key: {{ .Values.storage.s3.existingSecretSecretAccessKeyKey }}
  {{- end }}
  {{- if .Values.openai.existingSecret }}
  - name: OPENAI_API_KEY
    valueFrom:
      secretKeyRef:
        name: {{ .Values.openai.existingSecret }}
        key: {{ .Values.openai.existingSecretKey }}
  - name: OPENAI_BASE_URL
    value: {{ .Values.openai.baseUrl | quote }}
  - name: OPENAI_VISION_MODEL
    value: {{ .Values.openai.visionModel | quote }}
  - name: OPENAI_RESEARCH_MODEL
    value: {{ .Values.openai.researchModel | quote }}
  {{- end }}
  {{- if .Values.openai.credentialExistingSecret }}
  - name: AI_CREDENTIAL_ENCRYPTION_KEY
    valueFrom:
      secretKeyRef:
        name: {{ .Values.openai.credentialExistingSecret }}
        key: {{ .Values.openai.credentialExistingSecretKey }}
  {{- end }}
  {{- if .Values.openai.allowedPrivateOrigins }}
  - name: AI_ALLOWED_PRIVATE_ORIGINS
    value: {{ join "," .Values.openai.allowedPrivateOrigins | quote }}
  {{- end }}
  {{- if .Values.mcp.enabled }}
  - name: MCP_ALLOWED_HOSTS
    value: {{ include "roastbook.mcpAllowedHosts" . | quote }}
  {{- if .Values.mcp.allowedOrigins }}
  - name: MCP_ALLOWED_ORIGINS
    value: {{ join "," .Values.mcp.allowedOrigins | quote }}
  {{- end }}
  {{- end }}
  - name: AI_TELEMETRY_STORE_PAYLOADS
    value: {{ .Values.openai.telemetryStorePayloads | quote }}
  - name: AI_TELEMETRY_RETENTION_DAYS
    value: {{ .Values.openai.telemetryRetentionDays | quote }}
  - name: AI_TELEMETRY_MAX_PAYLOAD_BYTES
    value: {{ .Values.openai.telemetryMaxPayloadBytes | quote }}
{{- end -}}
