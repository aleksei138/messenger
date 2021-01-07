import XLSX from 'xlsx';
import { useState, useRef } from 'react'
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogContent from '@material-ui/core/DialogContent';
import DialogActions from '@material-ui/core/DialogActions';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableContainer from '@material-ui/core/TableContainer';
import TableRow from '@material-ui/core/TableRow';
import GetAppIcon from '@material-ui/icons/GetApp';
import Dialog from '@material-ui/core/Dialog';
import Button from '@material-ui/core/Button';
import InsertDriveFileIcon from '@material-ui/icons/InsertDriveFile';
import './tasks.css'


export default function ExcelEdit(props) {

    const [sheet, setSheet] = useState([]);
    const [headers, setHeaders] = useState([]);
    const editable = useRef([]);
    const fileName = useRef();

    function resize(arr, newSize, defaultValue) {
        return [ ...arr, ...Array(Math.max(newSize - arr.length, 0)).fill(defaultValue)];
    }

    // 0 => A, .... 25 => Z, 26 => AA
    function numToLetters(i) {
        if (i > 25) { 
            return numToLetters((i / 26 >> 0) - 1) +  'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[i % 26 >> 0]
        } else { 
            return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[i]
        }
    }

    function handleFile(event) {
        if (!event.target || !event.target.files || !event.target.files[0])
            return;
        
		const reader = new FileReader();
		const rABS = !!reader.readAsBinaryString;
		reader.onload = (e) => {
			const bstr = e.target.result;
			const wb = XLSX.read(bstr, {type:rABS ? 'binary' : 'array', cellDates: true}); //cellDates: true
			const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];

            // parse
            const parsed = XLSX.utils.sheet_to_json(ws, {header:1});                    

            // to align row lengths
            var maxLength = Math.max(...parsed.map(x => x.length));

            var data = parsed.map(element => {
                // replace empty
                let replaced = Array.from(element, item => typeof item === 'undefined' ? '' : item);
                
                // fill to align
                let resized = resize(replaced, maxLength, '');

                return resized;
            });

            editable.current = data;

            // add A ...Z, AA.....AZ, ..... to headers
            let headers = new Array(maxLength).fill('');
            headers = headers.map((x, i) => numToLetters(i));
            headers.unshift('');

            setHeaders(headers);            
            setSheet(data);            

        };
        
        fileName.current = event.target.files[0].name;
        let splited = fileName.current.split('.');
        if (splited && splited[1]) {
            splited.pop();
            fileName.current = splited.join('');
        }
        

        if(rABS) 
            reader.readAsBinaryString(event.target.files[0]); 
        else
            reader.readAsArrayBuffer(event.target.files[0]);
    }
    
    // for dates
    function formatCellObject(obj) {
        if (typeof obj.getMonth === 'function') {
            return obj.toLocaleString('en-GB');
        }
        else {
            return obj;
        }
    }

    function saveChanges(text, row, index) {
        editable.current[row][index] = text;
    }

    function sheet_to_workbook(sheet, opts) {
        var n = opts && opts.sheet ? opts.sheet : "Sheet1";
        var sheets = {}; sheets[n] = sheet;
        return { SheetNames: [n], Sheets: sheets };
    }
    
    function aoa_to_workbook(data, opts){
        return sheet_to_workbook(XLSX.utils.aoa_to_sheet(data, opts), opts);
    }

    function download() {
        if (editable.current && editable.current[0]) {
            const workbook = aoa_to_workbook(editable.current);
            XLSX.writeFile(workbook, fileName.current + '.xlsx');
        }
        
    }

    
    

    return (
        <Dialog
            maxWidth="false"
            open={props.open}
        >
            <DialogTitle>Edit Excel</DialogTitle>
            <DialogContent dividers>
                <div style={{minWidth: '400px'}}>
                    { !sheet[0] &&
                        <div style={{display: 'flex', marginBottom: '2em'}}>
                            <Button component="label" variant="contained" color="primary" startIcon={<InsertDriveFileIcon />}>
                                <input onChange={handleFile} style={{display: 'none'}} type="file" accept="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"/>
                                Choose an excel file
                            </Button>
                        </div>
                    }
                    <div>
                        { sheet[0] &&
                            <TableContainer>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                        {headers.map((header) => (
                                            <TableCell className="head-cell" align="center">{header}</TableCell>
                                        ))}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        { sheet.map((row, rowIndex) => (
                                                <TableRow>        
                                                    <TableCell className="head-cell">{rowIndex + 1}</TableCell>                                           
                                                    {
                                                        row.map((cell, cellIndex) => (
                                                            <TableCell 
                                                                contentEditable="true"
                                                                suppressContentEditableWarning={true}
                                                                onInput={event => {
                                                                    saveChanges(event.target.innerHTML, rowIndex, cellIndex);
                                                                }}
                                                                className="empty-cell"
                                                                align="center"
                                                            >
                                                                {formatCellObject(cell)}
                                                            </TableCell>
                                                        ))
                                                    }                                                    
                                                </TableRow>

                                            ))
                                        }
                                    
                                    </TableBody>
                                </Table>
                            </TableContainer>

                        }                    
                    </div>
                </div>                
            </DialogContent>
            <DialogActions> 

                { editable.current && editable.current[0] &&
                    <Button onClick={download} color="primary" startIcon={<GetAppIcon />}>
                        Download
                    </Button>
                }

                <Button onClick={() => {
                    setSheet([]);
                    editable.current = [];
                    fileName.current = '';
                    props.onClose();
                }} color="primary">
                    Close
                </Button>

            </DialogActions>
        </Dialog>
    );
}
