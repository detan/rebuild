// ~~ 数据列表
class RbList extends React.Component {
    constructor(props) {
        super(props)
        let fields = props.config.fields
        props.config.fields = null
        this.state = { ...props, fields: fields, rowData: [], noData: false, checkedAll: false, pageNo: 1, pageSize: 20 }
        
        this.toggleAllRow = this.toggleAllRow.bind(this)
        this.setPageNo = this.setPageNo.bind(this)
        this.setPageSize = this.setPageSize.bind(this)
        
        this.__defaultColumnWidth = $('#react-list').width() / 10
        if (this.__defaultColumnWidth < 130) this.__defaultColumnWidth = 130
    }
    render() {
        let that = this;
        const lastIndex = this.state.fields.length
        return (
        <div>
            <div className="row rb-datatable-body">
            <div className="col-sm-12">
                <div className="rb-scroller" ref="rblist-scroller">
                    <table className="table table-hover table-striped">
                    <thead>
                        <tr>
                            <th className="column-checkbox">
                                <div><label className="custom-control custom-control-sm custom-checkbox"><input className="custom-control-input" type="checkbox" checked={this.state.checkedAll} onClick={this.toggleAllRow} /><span className="custom-control-label"></span></label></div>
                            </th>
                            {this.state.fields.map((item, index) =>{
                                let columnWidth = (item.width || that.__defaultColumnWidth) + 'px'
                                let styles = { width: columnWidth }
                                let sortClazz = item.sort || ''
                                return (<th key={'field-' + item.field} style={styles} className="sortable unselect" onClick={this.fieldSort.bind(this, item.field)}><div style={styles}>{item.label}<i className={'zmdi ' + sortClazz}></i><i className="split"></i></div></th>)
                            })}
                            <th className="column-empty"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {this.state.rowData.map((item, index) => {
                            let lastGhost = item[lastIndex]
                            return (<tr key={'row-' + lastGhost[0]} className={lastGhost[3] ? 'table-active' : ''} onClick={this.clickRow.bind(this, index, false)}>
                                <td className="column-checkbox">
                                    <div><label className="custom-control custom-control-sm custom-checkbox"><input className="custom-control-input" type="checkbox" checked={lastGhost[3]} onClick={this.clickRow.bind(this, index, true)} /><span className="custom-control-label"></span></label></div>
                                </td>
                                {item.map((cell, index) => {
                                    return that.renderCell(cell, index, lastGhost)
                                })}
                                <td className="column-empty"></td>
                            </tr>)
                        })}    
                    </tbody>
                    </table>
                    {this.state.noData == true ? <div className="nodata"><span className="modal-main-icon zmdi zmdi-info-outline"/><p>没有检索到数据</p></div> : null}
                </div>
            </div></div>
            <RbListPagination pageNo={this.state.pageNo} pageSize={this.state.pageSize} rowTotal={this.state.rowTotal} $$$parent={this} />
        </div>);
    }
    componentDidMount() {
        const scroller = $(this.refs['rblist-scroller'])
        scroller.perfectScrollbar()
        
        let that = this
        scroller.find('th .split').draggable({ containment: '.rb-datatable-body', axis: 'x', helper: 'clone', stop: function(event, ui){
            let field = $(event.target).parent().parent().data('field')
            let left = ui.position.left - 4;
            if (left < 40) left = 40
            let fields = that.state.fields
            for (let i = 0; i < fields.length; i++){
                if (fields[i].field == field){
                    fields[i].width = left
                    break;
                }
            }
            that.setState({ fields: fields }, function(){
            })
        }})
        this.fetchList()
    }
    componentDidUpdate() {
        let that = this
        this.__selectedRows = []
        this.state.rowData.forEach((item) => {
            let lastGhost = item[that.state.fields.length]
            if (lastGhost[3] == true) that.__selectedRows.push(lastGhost)
        })
        
        $('.J_delete, .J_view, .J_edit').attr('disabled', true)
        let len = this.__selectedRows.length
        if (len > 0) $('.J_delete').attr('disabled', false)
        if (len == 1) $('.J_view, .J_edit').attr('disabled', false)
    }
    
    fetchList(filter) {
        let fields = []
        let field_sort = null
        this.state.fields.forEach(function(item){
            fields.push(item.field)
            if (!!item.sort) field_sort = item.field + ':' + item.sort.replace('sort-', '')
        });
        const entity = this.props.config.entity
        this.lastFilter = filter || this.lastFilter
        let query = {
            entity: entity,
            fields: fields,
            pageNo: this.state.pageNo,
            pageSize: this.state.pageSize,
            sort: field_sort,
            filter: this.lastFilter,
            reload: true,
        };
        let that = this;
        $('#react-list').addClass('rb-loading-active')
        $.post(rb.baseUrl + '/app/' + entity + '/record-list', JSON.stringify(query), function(res){
            if (res.error_code == 0){
                let rowdata = res.data.data
                if (rowdata.length > 0) {
                    let lastIndex = rowdata[0].length - 1
                    rowdata = rowdata.map((item) => {
                        item[lastIndex][3] = false  // Checked?
                        return item
                    })
                }
                that.setState({ noData: rowdata.length == 0, rowData: rowdata, rowTotal: res.data.total })
            }else{
                rb.notice(res.error_msg || '加载失败，请稍后重试', 'danger')
            }
            $('#react-list').removeClass('rb-loading-active')
        });
    }
    
    // 渲染表格及相关事件处理
    
    renderCell(cellVal, index, lastGhost) {
        if (this.state.fields.length == index) return null
        if (!!!cellVal) return <td><div></div></td>
       
        const field = this.state.fields[index]
        let styles = { width: (this.state.fields[index].width || this.__defaultColumnWidth) + 'px' }
        if (field.type == 'IMAGE') {
            cellVal = JSON.parse(cellVal || '[]')
            return <td><div style={styles} className="img-field column-imgs">{cellVal.map((item)=>{
                return <span><a href={'#!/Preview/' + item} className="img-thumbnail img-upload"><img src={rb.storageUrl + item + '?imageView2/2/w/100/interlace/1/q/100'} /></a></span>
            })}<div className="clearfix" /></div></td>
        } else if (field.type == 'FILE') {
            cellVal = JSON.parse(cellVal || '[]')
            return <td><div style={styles} className="column-files"><ul className="list-unstyled">{cellVal.map((item)=>{
                let fileName = __fileCutName(item)
                return <li className="text-truncate"><a href={'#!/Preview/' + item}>{fileName}</a></li>
            })}</ul></div></td>;
        } else if (field.type == 'REFERENCE'){
            return <td><div style={styles}><a href={'#!/View/' + cellVal[2][0] + '/' + cellVal[0]} onClick={() => this.clickView(cellVal)}>{cellVal[1]}</a></div></td>
        } else if (field.field == this.props.config.nameField){
            cellVal = lastGhost
            return <td><div style={styles}><a href={'#!/View/' + cellVal[2][0] + '/' + cellVal[0]} onClick={() => this.clickView(cellVal)} className="column-main">{cellVal[1]}</a></div></td>
        } else if (field.type == 'URL') {
            return <td><div style={styles}><a href={rb.baseUrl + '/common/url-safe?url=' + encodeURIComponent(cellVal)} className="column-url" target="_blank">{cellVal}</a></div></td>
        } else if (field.type == 'EMAIL') {
            return <td><div style={styles}><a href={'mailto:' + cellVal} className="column-url">{cellVal}</a></div></td>
        } else {
            return <td><div style={styles}>{cellVal}</div></td>
        }
    }
    
    toggleAllRow(e) {
        let checked = this.state.checkedAll == false
        let _rowData = this.state.rowData
        _rowData = _rowData.map((item) => {
            item[item.length - 1][3] = checked  // Checked?
            return item;
        });
        this.setState({ checkedAll: checked, rowData: _rowData })
        return false;
    }
    clickRow(rowIndex, holdOthers, e) {
        if (e.target.tagName == 'SPAN') return false
        e.stopPropagation()
        e.nativeEvent.stopImmediatePropagation()
        
        let _rowData = this.state.rowData
        let lastIndex = _rowData[0].length - 1
        if (holdOthers == true){
            let item = _rowData[rowIndex];
            item[lastIndex][3] = item[lastIndex][3] == false  // Checked?
            _rowData[rowIndex] = item
        } else {
            _rowData = _rowData.map((item, index) => {
                item[lastIndex][3] = index == rowIndex
                return item
            })
        }
        this.setState({ rowData: _rowData })
        return false
    }
    
    clickView(cellVal) {
        rb.RbViewModal({ id: cellVal[0], entity: cellVal[2][0] })
        return false;
    }
    
    // 分页
    
    setPageNo(pageNo) {
        let that = this
        this.setState({ pageNo: pageNo || 1 }, function(){
            that.fetchList()
        })
    }
    setPageSize(pageSize) {
        console.log(pageSize)
        let that = this
        this.setState({ pageNo: 1, pageSize: pageSize || 20 }, function(){
            that.fetchList()
        })
    }
    
    // 外部接口
    
    getSelectedRows() {
        return this.__selectedRows
    }
    
    search(filter) {
        this.fetchList(filter)
    }
    
    reload() {
        this.fetchList()
    }
    
    // 配置相关
    
    fieldSort(field, e) {
        let fields = this.state.fields;
        for (let i = 0; i < fields.length; i++){
            if (fields[i].field == field){
                if (fields[i].sort == 'sort-asc') fields[i].sort = 'sort-desc';
                else fields[i].sort = 'sort-asc';
            } else {
                fields[i].sort = null
            }
        }
        let that = this
        this.setState({ fields: fields }, function(){
            that.fetchList()
        })
        
        e.stopPropagation()
        e.nativeEvent.stopImmediatePropagation()
        return false
    }
}

// 分页组件
class RbListPagination extends React.Component {
    constructor(props) {
        super(props)
        this.prev = this.prev.bind(this)
        this.next = this.next.bind(this)
    }
    render() {
        let props = this.props
        this.pageTotal = Math.ceil(props.rowTotal / props.pageSize)
        if (this.pageTotal <= 0) this.pageTotal = 1
        const pages = calcPages(this.pageTotal, props.pageNo)
        return (
            <div className="row rb-datatable-footer">
                <div className="col-sm-5">
                    <div className="dataTables_info">{props.rowTotal > 0 ? `共 ${props.rowTotal} 条数据` : ''}</div>
                </div>
                <div className="col-sm-7">
                    <div className="dataTables_paginate paging_simple_numbers">
                        <ul className="pagination">
                            {props.pageNo > 1 && <li className="paginate_button page-item"><a className="page-link" onClick={this.prev}><span className="icon zmdi zmdi-chevron-left"></span></a></li>}
                            {pages.map((item) => {
                                if (item == '.') return <li className="paginate_button page-item disabled"><a className="page-link">...</a></li>
                                else return <li className={'paginate_button page-item ' + (props.pageNo == item && 'active')}><a href="javascript:;" className="page-link" onClick={this.goto.bind(this, item)}>{item}</a></li>
                            })}
                            {props.pageNo != this.pageTotal && <li className="paginate_button page-item"><a className="page-link" onClick={this.next}><span className="icon zmdi zmdi-chevron-right"></span></a></li>}
                        </ul>
                    </div>
                </div>
            </div>
        )
    }
    prev() {
        if (this.props.pageNo == 1) return
        else this.props.$$$parent.setPageNo(this.props.pageNo - 1)
    }
    next() {
        if (this.props.pageNo == this.pageTotal) return
        else this.props.$$$parent.setPageNo(this.props.pageNo + 1)
    }
    goto(pageNo) {
        if (this.props.pageNo == pageNo) return
        else this.props.$$$parent.setPageNo(pageNo)
    }
}

// -- Usage

var rb = rb || {}

// props = { config }
rb.RbList = function(props, target) {
    return renderRbcomp(<RbList {...props} />, target || 'react-list')
}

// props = { rowTotal, pageSize, pageNo }
rb.RbListPagination = function(props, target) {
    return renderRbcomp(<RbListPagination {...props} />, target || 'pagination')
}
