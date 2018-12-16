$(document).ready(() => {
    $(window).trigger('resize')
    
    $('.chart-type>a').tooltip({ html:true, container:'.config-aside' })
    
	let dragIsNum = false
    $('.fields a').draggable({
    	helper: 'clone',
    	appendTo: 'body',
    	cursor: 'move',
    	cursorAt: { top: 14, left: 75 },
    	start: function(){
    		dragIsNum = $(this).data('type') == 'num'
    	}
    })
	$('.axis-target').droppable({
		accept: function(){
			if ($(this).hasClass('J_axis-dim')) return !dragIsNum
			else return true
		},
		drop: function(event, ui){
			add_axis(this, $(ui.draggable[0]))
		}
	})
	
	let cts = $('.chart-type > a').click(function(){
		let _this = $(this)
		if (_this.hasClass('active') == false) return
		cts.removeClass('select')
		_this.addClass('select')
		render_option()
	})
	
	$('.rb-toggle-left-sidebar').attr('title', '保存并返回').off('click').on('click', () => {
	    let cfg = build_config()
	    if (!!!cfg) return
	    let _data = { config: JSON.stringify(cfg), title: cfg.title, belongEntity: cfg.entity, type: cfg.type }
	    _data.metadata = { entity: 'ChartConfig', id: window.__chartId }
	    
	    console.log(JSON.stringify(_data))
        $.post(rb.baseUrl + '/dashboard/chart-save?dashid=' + $urlp('dashid'), JSON.stringify(_data), function(res){
            if (res.error_code == 0){
                window.__chartId = res.data.id
            }
        })
	    
	}).find('.zmdi').addClass('zmdi-arrow-left')
	
	if (window.__chartConfig && window.__chartConfig.axis) {
	    let cfg = window.__chartConfig
	    $(cfg.axis.dimension).each((idx, item) => { add_axis('.J_axis-dim', item) })
	    $(cfg.axis.numerical).each((idx, item) => { add_axis('.J_axis-num', item) })
	    $('.chart-type>a[data-type="' + cfg.type + '"]').trigger('click')
	}
    if (!window.__chartId) $('<h4 class="chart-undata must-center">当前图表无数据</h4>').appendTo('#chart-preview')
})
$(window).resize(() => {
    $('#chart-preview').height($(window).height() - 170)
})

const CTs = { SUM:'求和', AVG:'平均值', MAX:'最大值', MIN:'最小值', COUNT:'计数', Y:'按年', Q:'按季', M:'按月', D:'按日', H:'按时' }
let add_axis = ((target, axis) => {
	let el = $($('#axis-ietm').html()).appendTo($(target))
	let fName = null
	let fLabel = null
	let fType = null
	let ct = null  // calc-type
	
	let isNum = $(target).hasClass('J_axis-num')
	
	if (!!axis.field){
	    let field = $('.fields [data-field="' + axis.field + '"]')
	    fName = axis.field
	    fLabel = field.text()
	    fType = field.data('type')
	    ct = CTs[axis.calc]
	    el.attr({ 'data-calc': axis.calc, 'data-sort': axis.sort })
	} else{
	    fName = axis.data('field')
	    fLabel = axis.text()
	    fType = axis.data('type')
	    
    	if (isNum) {
    		if (fType == 'text' || fType == 'date') ct = '计数'
    		else ct = '求和'
    	} else {
    		if (fType == 'date') ct = '按日'
    	}
	}
	
	if (isNum) {
        if (fType == 'date' || fType == 'text') el.find('.J_date, .J_num').remove()
        else el.find('.J_date').remove()
    } else {
        if (fType == 'date') el.find('.J_text, .J_num').remove()
        else el.find('.J_text, .J_num, .J_date, .dropdown-divider').remove()
    }
	
	el.find('.dropdown-item').click(function(){
		let that = $(this)
		let calc = that.data('calc')
		let sort = that.data('sort')
		if (calc){
			el.find('span').text(fLabel + (' (' + that.text() + ')'))
			el.attr('data-calc', calc)
		} else if (sort){
			el.attr('data-sort', sort)
		}
		render_option()
	})
	
	el.attr({ 'data-type': fType, 'data-field': fName })
	el.find('span').text(fLabel + (ct ? (' (' + ct + ')') : ''))
	el.find('a.del').click(()=>{
		el.remove()
		render_option()
	})
	render_option()
})

// 图表选项
let render_option = (() => {
	let cts = $('.chart-type>a').removeClass('active')
	let dimsAxis = $('.J_axis-dim .item').length
	let numsAxis = $('.J_axis-num .item').length
	
	cts.each(function(){
	    let _this = $(this)
	    let dims = (_this.data('allow-dims') || '0|0').split('|')
	    let nums = (_this.data('allow-nums') || '0|0').split('|')
	    if (dimsAxis >= ~~dims[0] && dimsAxis <= ~~dims[1] && numsAxis >= ~~nums[0] && numsAxis <= ~~nums[1]) _this.addClass('active')
	})
	
	let select = $('.chart-type>a.select')
	if (!select.hasClass('active')) select.removeClass('select')
	
	select = $('.chart-type>a.select')
	if (select.length == 0) $('.chart-type>a.active').eq(0).addClass('select')
	
	render_preview()
})

// 生成预览
let render_preview_timer = null
let render_preview_chart = null
let render_preview = (() => {
    if (render_preview_timer){
        clearTimeout(render_preview_timer)
        render_preview_timer = null
    }
    
    render_preview_timer = setTimeout(()=>{
        if (!!render_preview_chart){
            ReactDOM.unmountComponentAtNode($('#chart-preview')[0])
            render_preview_chart = null
        }
        
        let cfg = build_config()
        if (!cfg){
            $('#chart-preview').html('<h4 class="chart-undata must-center">当前图表无数据</h4>')
            return
        }
        
        $('#chart-preview').empty()
        render_preview_chart = detectChart(cfg)
        if (!!render_preview_chart) renderRbcomp(render_preview_chart, 'chart-preview')
        else $('#chart-preview').html('<h4 class="chart-undata must-center">不支持的图表类型</h4>')
        
    }, 500)
})

let build_config = (() => {
    let cfg = { entity: window.__sourceEntity, title: $val('#chart-title') || '未命名图表' }
    cfg.type = $('.chart-type>a.select').data('type')
    if (!cfg.type) return
    
    let dims = []
    let nums = []
    $('.J_axis-dim>span').each((idx, item) => {
        dims.push(__build_axisItem(item, false))
    })
    $('.J_axis-num>span').each((idx, item) => {
        nums.push(__build_axisItem(item, true))
    })
    if (dims.length == 0 && nums.length == 0) return
    cfg.axis = { dimension: dims, numerical: nums }
    
    return cfg
})
let __build_axisItem = ((item, isNum) => {
    item = $(item)
    let x = { field: item.data('field'), sort: item.attr('data-sort') || '' }
    if (isNum){
        x.calc = item.attr('data-calc') || 'SUM'
    } else if (item.data('type') == 'date'){
        x.calc = item.attr('data-calc') || 'D'
    }
    return x
})