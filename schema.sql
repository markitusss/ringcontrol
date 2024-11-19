-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist
DROP TABLE IF EXISTS monthly_stats;
DROP TABLE IF EXISTS historial_importacion;
DROP TABLE IF EXISTS facturas;
DROP TABLE IF EXISTS clients;
DROP TABLE IF EXISTS company_settings;

-- Company Settings Table
CREATE TABLE company_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name VARCHAR(255) NOT NULL,
    logo_url TEXT,
    review_percentage INTEGER NOT NULL DEFAULT 15,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Clients Table
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alias VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Facturas Table
CREATE TABLE facturas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    numero_factura VARCHAR(50) NOT NULL UNIQUE,
    fecha DATE NOT NULL,
    alias VARCHAR(255) NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    mes INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
    anio INTEGER NOT NULL,
    no_revisar BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT positive_amount CHECK (total >= 0),
    CONSTRAINT fk_client FOREIGN KEY (alias) REFERENCES clients(alias)
);

-- Monthly Statistics Table
CREATE TABLE monthly_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mes INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
    anio INTEGER NOT NULL,
    total_facturas INTEGER NOT NULL DEFAULT 0,
    importe_total DECIMAL(12,2) NOT NULL DEFAULT 0,
    importe_revisable DECIMAL(12,2) NOT NULL DEFAULT 0,
    importe_no_revisable DECIMAL(12,2) NOT NULL DEFAULT 0,
    importe_25_no_revisable DECIMAL(12,2) NOT NULL DEFAULT 0,
    importe_total_final DECIMAL(12,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_month_year UNIQUE (mes, anio)
);

-- Historial de Importación Table
CREATE TABLE historial_importacion (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mes INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
    anio INTEGER NOT NULL,
    fecha_importacion TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_facturas_mes_anio ON facturas(mes, anio);
CREATE INDEX idx_facturas_fecha ON facturas(fecha);
CREATE INDEX idx_facturas_alias ON facturas(alias);
CREATE INDEX idx_clients_alias ON clients(alias);
CREATE INDEX idx_historial_mes_anio ON historial_importacion(mes, anio);
CREATE INDEX idx_monthly_stats_mes_anio ON monthly_stats(mes, anio);

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to update monthly statistics
CREATE OR REPLACE FUNCTION update_monthly_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Delete existing stats for the affected month
    DELETE FROM monthly_stats
    WHERE mes = COALESCE(OLD.mes, NEW.mes)
    AND anio = COALESCE(OLD.anio, NEW.anio);

    -- Insert new stats
    INSERT INTO monthly_stats (
        mes,
        anio,
        total_facturas,
        importe_total,
        importe_revisable,
        importe_no_revisable,
        importe_25_no_revisable,
        importe_total_final
    )
    SELECT
        mes,
        anio,
        COUNT(*) as total_facturas,
        COALESCE(SUM(total), 0) as importe_total,
        COALESCE(SUM(CASE WHEN NOT no_revisar THEN total ELSE 0 END), 0) as importe_revisable,
        COALESCE(SUM(CASE WHEN no_revisar THEN total ELSE 0 END), 0) as importe_no_revisable,
        COALESCE(SUM(CASE WHEN no_revisar THEN total * 0.25 ELSE 0 END), 0) as importe_25_no_revisable,
        COALESCE(
            SUM(CASE WHEN NOT no_revisar THEN total ELSE 0 END) +
            SUM(CASE WHEN no_revisar THEN total * 0.25 ELSE 0 END),
            0
        ) as importe_total_final
    FROM facturas
    WHERE mes = COALESCE(OLD.mes, NEW.mes)
    AND anio = COALESCE(OLD.anio, NEW.anio)
    GROUP BY mes, anio;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER update_company_settings_updated_at
    BEFORE UPDATE ON company_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_facturas_updated_at
    BEFORE UPDATE ON facturas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at
    BEFORE UPDATE ON clients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_monthly_stats_updated_at
    BEFORE UPDATE ON monthly_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for monthly stats updates
CREATE TRIGGER update_monthly_stats_on_factura_change
    AFTER INSERT OR UPDATE OR DELETE ON facturas
    FOR EACH ROW
    EXECUTE FUNCTION update_monthly_stats();

-- Enable Row Level Security (RLS)
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE facturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE historial_importacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_stats ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Authenticated users can view company settings"
    ON company_settings FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can modify company settings"
    ON company_settings FOR ALL
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can view clients"
    ON clients FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can modify clients"
    ON clients FOR ALL
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can view facturas"
    ON facturas FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can modify facturas"
    ON facturas FOR ALL
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can view historial"
    ON historial_importacion FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can modify historial"
    ON historial_importacion FOR ALL
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can view monthly stats"
    ON monthly_stats FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can modify monthly stats"
    ON monthly_stats FOR ALL
    TO authenticated
    USING (true);

-- Insert initial company settings if not exists
INSERT INTO company_settings (company_name, review_percentage)
SELECT 'My Company', 15
WHERE NOT EXISTS (SELECT 1 FROM company_settings);