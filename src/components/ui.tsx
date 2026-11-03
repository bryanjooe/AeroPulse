import { flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable, type ColumnDef, type SortingState } from '@tanstack/react-table';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Download, Eye, Search, Sparkles, X } from 'lucide-react';
import { useMemo, useState, type ElementType, type ReactNode } from 'react';

export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const labels: Record<string, string> = { in_air: 'In flight', completed: 'Arrived', succeeded: 'Paid', checked_in: 'Checked in', in_transit: 'In transit', confirmed: 'Confirmed', cancelled: 'Cancelled', refunded: 'Refunded', failed: 'Failed', delayed: 'Delayed', boarding: 'Boarding', departed: 'Departed', scheduled: 'Scheduled', landed: 'Landed', loaded: 'Loaded', claimed: 'Claimed', void: 'Voided', active: 'Active', pending: 'Pending' };
  return <span className={`badge badge-${normalized.replace('_','-')}`}><i />{labels[normalized] ?? status}</span>;
}

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="page-header"><div><div className="eyebrow">{eyebrow ?? 'OPERATIONS'}</div><h1>{title}</h1>{description && <p>{description}</p>}</div>{action && <div className="page-header-action">{action}</div>}</div>;
}

export function StatCard({ label, value, change, icon: Icon, tone = 'blue', footnote }: { label: string; value: string; change?: string; icon: ElementType; tone?: string; footnote?: string }) {
  return <motion.div className="stat-card card" whileHover={{ y: -3, transition: { duration: .18 } }}><div className={`stat-icon ${tone}`}><Icon size={19}/></div><div className="stat-label">{label}</div><div className="stat-value">{value}</div><div className="stat-foot">{change && <span className="trend">↗ {change}</span>}{footnote && <span>{footnote}</span>}</div></motion.div>;
}

export function DataTable<T>({ data, columns, searchPlaceholder = 'Search records…', emptyTitle = 'No records found', emptyDescription = 'Try changing your filters.', onRowClick, onRowDoubleClick }: { data: T[]; columns: ColumnDef<T, any>[]; searchPlaceholder?: string; emptyTitle?: string; emptyDescription?: string; onRowClick?: (row:T)=>void; onRowDoubleClick?: (row:T)=>void }) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnVisibility,setColumnVisibility]=useState<Record<string,boolean>>({});
  const [rowSelection,setRowSelection]=useState<Record<string,boolean>>({});
  const table = useReactTable({ data, columns, enableRowSelection:true, state: { sorting, globalFilter, columnVisibility, rowSelection }, onSortingChange: setSorting, onGlobalFilterChange: setGlobalFilter, onColumnVisibilityChange:setColumnVisibility, onRowSelectionChange:setRowSelection, getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel(), getFilteredRowModel: getFilteredRowModel(), getPaginationRowModel: getPaginationRowModel(), initialState: { pagination: { pageSize: 8 } } });
  const exportCsv=()=>{
    const visible=table.getVisibleLeafColumns();
    const quote=(value:unknown)=>`"${String(value??'').replaceAll('"','""')}"`;
    const lines=[visible.map(c=>quote(typeof c.columnDef.header==='string'?c.columnDef.header:c.id)).join(','),...table.getSortedRowModel().rows.map(row=>visible.map(column=>quote(row.getValue(column.id))).join(','))];
    const url=URL.createObjectURL(new Blob([lines.join('\r\n')],{type:'text/csv;charset=utf-8'}));const anchor=document.createElement('a');anchor.href=url;anchor.download='airport-records.csv';anchor.click();URL.revokeObjectURL(url);
  };
  return <div className="table-card card"><div className="table-toolbar"><div className="search-box"><Search size={16}/><input aria-label="Search table" placeholder={searchPlaceholder} value={globalFilter} onChange={e=>{setGlobalFilter(e.target.value);table.setPageIndex(0)}}/>{globalFilter && <button className="clear-button" onClick={()=>setGlobalFilter('')} aria-label="Clear search"><X size={14}/></button>}</div><div className="table-tools"><span className="table-total">{table.getFilteredRowModel().rows.length} records{table.getSelectedRowModel().rows.length?` · ${table.getSelectedRowModel().rows.length} selected`:''}</span><details className="column-menu"><summary aria-label="Toggle visible columns"><Eye size={14}/> Columns</summary><div>{table.getAllLeafColumns().filter(column=>column.getCanHide()).map(column=><label key={column.id}><input type="checkbox" checked={column.getIsVisible()} onChange={column.getToggleVisibilityHandler()}/>{typeof column.columnDef.header==='string'?column.columnDef.header:column.id}</label>)}</div></details><button className="table-export" onClick={exportCsv} aria-label="Export filtered rows as CSV"><Download size={14}/> CSV</button></div></div>
    <div className="table-scroll"><table><thead>{table.getHeaderGroups().map(group=><tr key={group.id}><th className="selection-cell"><input type="checkbox" aria-label="Select all rows on this page" checked={table.getIsAllPageRowsSelected()} ref={el=>{if(el)el.indeterminate=table.getIsSomePageRowsSelected()}} onChange={table.getToggleAllPageRowsSelectedHandler()}/></th>{group.headers.map(header=><th key={header.id} onClick={header.column.getCanSort()?header.column.getToggleSortingHandler():undefined} className={header.column.getCanSort()?'sortable':''} title={header.column.getCanSort()?'Click to sort; Shift-click to add a sort':''}>{flexRender(header.column.columnDef.header,header.getContext())}{header.column.getIsSorted()==='asc'?<ArrowUp size={12}/>:header.column.getIsSorted()==='desc'?<ArrowDown size={12}/>:null}</th>)}</tr>)}</thead>
    <tbody>{table.getRowModel().rows.map(row=><tr key={row.id} className={`${row.getIsSelected()?'row-selected':''} ${onRowClick||onRowDoubleClick?'row-clickable':''}`} onClick={()=>onRowClick?.(row.original)} onDoubleClick={()=>onRowDoubleClick?.(row.original)} onKeyDown={e=>{if(onRowClick&&(e.key==='Enter'||e.key===' ')){e.preventDefault();onRowClick(row.original)}}} tabIndex={onRowClick||onRowDoubleClick?0:undefined}><td className="selection-cell" onClick={e=>e.stopPropagation()}><input type="checkbox" aria-label="Select row" checked={row.getIsSelected()} onChange={row.getToggleSelectedHandler()}/></td>{row.getVisibleCells().map(cell=><td key={cell.id}>{flexRender(cell.column.columnDef.cell,cell.getContext())}</td>)}</tr>)}</tbody></table>
    {table.getRowModel().rows.length===0&&<div className="table-empty"><div className="empty-art"><Sparkles size={21}/></div><b>{emptyTitle}</b><span>{emptyDescription}</span></div>}</div>
    <div className="table-footer"><span>Page {table.getState().pagination.pageIndex+1} of {Math.max(1,table.getPageCount())}</span><div className="pagination"><button aria-label="Previous page" disabled={!table.getCanPreviousPage()} onClick={()=>table.previousPage()}><ChevronLeft size={16}/></button><button aria-label="Next page" disabled={!table.getCanNextPage()} onClick={()=>table.nextPage()}><ChevronRight size={16}/></button></div></div>
  </div>;
}

export function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return <AnimatePresence><motion.div className="toast" role="status" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}><span className="toast-check">✓</span>{message}<button onClick={onClose} aria-label="Dismiss notification"><X size={15}/></button></motion.div></AnimatePresence>;
}

export function IconButton({ children, label, onClick, className = '' }: { children: ReactNode; label: string; onClick?: () => void; className?: string }) {
  return <button type="button" className={`icon-button ${className}`} aria-label={label} title={label} onClick={onClick}>{children}</button>;
}

export function useTitle(title: string) { return useMemo(() => title, [title]); }
