// Check what columns exist in Supabase users table
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    try {
        // Try to select all columns from users (will fail but show us the schema)
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .limit(0);

        if (error) {
            console.log('Error (this might show available columns):', error.message);
            console.log('Full error:', JSON.stringify(error, null, 2));
        } else {
            console.log('Table exists, columns available');
        }

        // Try to get schema info directly
        const { data: schemaData, error: schemaError } = await supabase
            .rpc('get_table_columns', { table_name: 'users' })
            .select();

        console.log('Schema data:', schemaData);
        console.log('Schema error:', schemaError);

    } catch (err) {
        console.error('Caught error:', err.message);
    }
}

checkSchema();
