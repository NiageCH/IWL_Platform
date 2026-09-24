# =============================================================================
# Worker de análisis de repositorios · capa 1 del due diligence técnico (§4.4)
#
# El contenedor clona el repositorio, lo analiza y lo borra. El código de la
# compañía no sobrevive a la ejecución y no sale de aquí: lo que sale es el
# JSON de `esquema.ts`, con métricas, inventario y hallazgos.
#
# Ninguna herramienta ejecuta el código analizado. No se instalan las
# dependencias del repositorio: hacerlo correría sus scripts de instalación,
# que es exactamente lo que no se puede hacer con código de terceros.
# =============================================================================

FROM node:22-bookworm-slim

ARG SCC_VERSION=3.5.0
ARG SYFT_VERSION=1.18.1
ARG GRYPE_VERSION=0.87.0
ARG GITLEAKS_VERSION=8.24.0
ARG OSV_VERSION=1.9.2

ENV DEBIAN_FRONTEND=noninteractive \
    # Las herramientas escriben sus cachés aquí, fuera del código analizado
    XDG_CACHE_HOME=/var/cache/analisis \
    GRYPE_DB_CACHE_DIR=/var/cache/analisis/grype

RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates \
      curl \
      git \
      python3 \
      python3-pip \
      python3-venv \
      tar \
    && rm -rf /var/lib/apt/lists/*

# Semgrep en su propio entorno: trae bastantes dependencias de Python y no
# tiene por qué mezclarse con nada más
RUN python3 -m venv /opt/semgrep \
    && /opt/semgrep/bin/pip install --no-cache-dir semgrep==1.104.0
ENV PATH="/opt/semgrep/bin:${PATH}"

# Herramientas en binario. Se fija la versión de cada una: el documento pide
# que cada ejecución quede registrada con la versión de sus herramientas,
# porque si no, dos ejecuciones no son comparables.
RUN set -eux; \
    arch="$(dpkg --print-architecture)"; \
    case "$arch" in \
      amd64) scc_arch=x86_64; go_arch=amd64 ;; \
      arm64) scc_arch=arm64;  go_arch=arm64 ;; \
      *) echo "Arquitectura no contemplada: $arch" >&2; exit 1 ;; \
    esac; \
    \
    curl -fsSL "https://github.com/boyter/scc/releases/download/v${SCC_VERSION}/scc_Linux_${scc_arch}.tar.gz" \
      | tar -xz -C /usr/local/bin scc; \
    \
    curl -fsSL "https://github.com/anchore/syft/releases/download/v${SYFT_VERSION}/syft_${SYFT_VERSION}_linux_${go_arch}.tar.gz" \
      | tar -xz -C /usr/local/bin syft; \
    \
    curl -fsSL "https://github.com/anchore/grype/releases/download/v${GRYPE_VERSION}/grype_${GRYPE_VERSION}_linux_${go_arch}.tar.gz" \
      | tar -xz -C /usr/local/bin grype; \
    \
    curl -fsSL "https://github.com/gitleaks/gitleaks/releases/download/v${GITLEAKS_VERSION}/gitleaks_${GITLEAKS_VERSION}_linux_${go_arch}.tar.gz" \
      | tar -xz -C /usr/local/bin gitleaks; \
    \
    curl -fsSL -o /usr/local/bin/osv-scanner \
      "https://github.com/google/osv-scanner/releases/download/v${OSV_VERSION}/osv-scanner_linux_${go_arch}"; \
    chmod +x /usr/local/bin/osv-scanner; \
    \
    chmod +x /usr/local/bin/scc /usr/local/bin/syft /usr/local/bin/grype /usr/local/bin/gitleaks

WORKDIR /worker

COPY package.json tsconfig.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY . .

# El análisis corre sin privilegios. Si una herramienta tuviera un fallo con
# una entrada maliciosa, no lo hace como root.
RUN useradd --create-home --uid 10001 analista \
    && mkdir -p /var/cache/analisis /trabajo \
    && chown -R analista:analista /var/cache/analisis /trabajo /worker
USER analista

ENV DIRECTORIO_TRABAJO=/trabajo

ENTRYPOINT ["node", "--experimental-strip-types", "analizar.ts"]
