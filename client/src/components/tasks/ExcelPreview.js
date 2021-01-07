import XLSX from 'xlsx';
import { useState } from 'react'
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogContent from '@material-ui/core/DialogContent';
import DialogActions from '@material-ui/core/DialogActions';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableRow from '@material-ui/core/TableRow';
import Dialog from '@material-ui/core/Dialog';
import Button from '@material-ui/core/Button';
import InsertDriveFileIcon from '@material-ui/icons/InsertDriveFile';
import './tasks.css'


export default function ExcelPreview(props) {

    const [sheet, setSheet] = useState([]);

    function resize(arr, newSize, defaultValue) {
        return [ ...arr, ...Array(Math.max(newSize - arr.length, 0)).fill(defaultValue)];
    }

    function handleFile(event) {
        if (!event.target || !event.target.files || !event.target.files[0])
            return;
        
		const reader = new FileReader();
        const rABS = !!reader.readAsBinaryString;
        
		reader.onload = (e) => {

			const bstr = e.target.result;
			const wb = XLSX.read(bstr, {type:rABS ? 'binary' : 'array', cellDates: true})
			const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];

            // parse
            const parsed = XLSX.utils.sheet_to_json(ws, {header:1});            

            // find out max length to align row lengths
            var maxLength = Math.max(...parsed.map(x => x.length));

            var data = parsed.map(element => {
                // replace empty
                let replaced = Array.from(element, item => typeof item === 'undefined' ? '' : item);
                
                // resige to align
                let resized = resize(replaced, maxLength, '');

                // "padding"
                resized.push('');
                resized.unshift('');

                return resized;
            });

            let padding = new Array(maxLength + 2).fill('');
            data.unshift(padding);
            data.push(padding);
            
            setSheet(data);            

        };
        
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
    

    return (
        <Dialog
            maxWidth="false"
            open={props.open}
        >
            <DialogTitle>Preview Excel</DialogTitle>
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
                                <Table size="small" style={{userSelect: 'none'}}>
                                    <TableBody>
                                        { 
                                            sheet.map(row => (
                                                <TableRow>
                                                    {
                                                        row.map(cell => (
                                                            <TableCell className={cell ? "filled-cell" : "empty-cell"} align="center">{formatCellObject(cell)}</TableCell>
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
                <Button onClick={() => {
                    setSheet([]);
                    props.onClose();
                }} color="primary">
                    Close
                </Button>
            </DialogActions>
        </Dialog>
    );
}
